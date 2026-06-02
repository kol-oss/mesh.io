import { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type OlsrHelloMessage,
  type OlsrRouteRecord,
  type OlsrTcMessage,
} from "@/features/processor/types/protocols/olsr";
import { OLSR_DEFAULT_TC_TTL } from "@/shared/constants/protocols/olsr";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { OlsrConfiguration } from "@/shared/types/model/configurations";
import type { NetworkGraph } from "../../network/NetworkGraph";
import { RoutingStructure, type RoutingStructureType } from "../../types/module";
import type { Peer } from "../../types/network/peer";
import { clone } from "../../utils/clone";
import { BaseModule } from "../BaseModule";
import { MultipointRelaySet } from "./structures/MultipointRelaySet.ts";
import { NeighbourSet } from "./structures/NeighbourSet.ts";
import { RoutingTable } from "./structures/RoutingTable";
import { MultipointRelaySelectorSet } from "./structures/MultipointRelaySelectorSet.ts";
import { TopologySet } from "./structures/TopologySet.ts";
import { TwoHopNeighbourSet } from "./structures/TwoHopNeighbourSet.ts";
import { RefreshAction } from "@/shared/types/model/steps.ts";

// module for OLSR protocol
const PROTOCOL = RoutingProtocol.OLSR;

export class OlsrModule extends BaseModule {
  // routing structures (neighbour sets)
  private neighbourSet!: NeighbourSet;
  private twoHopNeighbourSet!: TwoHopNeighbourSet;

  // routing structures (multipoint relay sets)
  private mprSet!: MultipointRelaySet;
  private mprSelectorSet!: MultipointRelaySelectorSet;

  // routing structures (topology and routing tables)
  private topologySet!: TopologySet;
  private routingTable!: RoutingTable;

  // sequence numbers
  private lastTcSequenceByOriginator = new Map<UUID, number>();
  private ansn = 0;

  constructor(peerId: UUID, graph: NetworkGraph, eventRecorder: EventRecorder) {
    super(peerId, graph, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(MessageType.OlsrHelloMessage, MessageType.OlsrTcMessage);
  }

  // initialization of routing structures
  override init() {
    this.neighbourSet = new NeighbourSet();
    this.twoHopNeighbourSet = new TwoHopNeighbourSet();

    this.mprSet = new MultipointRelaySet();
    this.mprSelectorSet = new MultipointRelaySelectorSet();

    this.topologySet = new TopologySet();
    this.routingTable = new RoutingTable();
  }

  override process(message: Message): boolean {
    const { type: messageType } = message;

    // HELLO message
    if (messageType === MessageType.OlsrHelloMessage) {
      return this.processHello(message);
    }

    // Transaction Control message
    if (messageType === MessageType.OlsrTcMessage) {
      return this.processTransactionControl(message);
    }

    return false;
  }

  private processHello(message: OlsrHelloMessage) {
    if (message.sourcePeerId === this.peer.id) {
      return true;
    }

    const sender = this.graph.getNode(message.senderPeerId);
    if (!sender || sender.protocol !== PROTOCOL) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.UnsupportedProtocol,
      });
      return false;
    }

    const tick = this.eventRecorder.getCurrentTick();
    this.neighbourSet.set({
      neighbourPeerId: message.senderPeerId,
      status: message.mprPeerIds.includes(this.peer.id) ? "MPR" : "SYMMETRIC",
      lastUpdateTick: tick,
    });

    this.twoHopNeighbourSet.deleteByViaPeerId(message.senderPeerId);

    for (const destinationPeerId of message.neighbours) {
      if (
        destinationPeerId === this.peer.id ||
        destinationPeerId === message.senderPeerId ||
        this.neighbourSet.has(destinationPeerId)
      ) {
        continue;
      }

      this.twoHopNeighbourSet.set({
        destinationPeerId,
        viaPeerId: message.senderPeerId,
        lastUpdateTick: tick,
      });
    }

    if (message.mprPeerIds.includes(this.peer.id)) {
      this.mprSelectorSet.add(message.senderPeerId, tick);
    } else {
      this.mprSelectorSet.delete(message.senderPeerId);
    }

    this.recomputeMprSet();
    this.recomputeRoutingTable(message);

    return true;
  }

  private processTransactionControl(message: OlsrTcMessage) {
    if (message.sourcePeerId === this.peer.id) {
      return true;
    }

    const sender = this.graph.getNode(message.senderPeerId);
    if (!sender || sender.protocol !== PROTOCOL) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.UnsupportedProtocol,
      });
      return false;
    }

    const previousAnsn = this.lastTcSequenceByOriginator.get(message.sourcePeerId) ?? -1;
    if (message.ansn <= previousAnsn) {
      return true;
    }

    this.lastTcSequenceByOriginator.set(message.sourcePeerId, message.ansn);

    this.topologySet.deleteByLastHopPeerId(message.sourcePeerId);

    const tick = this.eventRecorder.getCurrentTick();
    for (const destinationPeerId of message.advertisedNeighbours) {
      this.topologySet.set({
        destinationPeerId,
        lastHopPeerId: message.sourcePeerId,
        sequenceNumber: message.ansn,
        lastUpdateTick: tick,
      });
    }

    this.recomputeRoutingTable(message);

    if (this.mprSelectorSet.size > 0 && message.timeToLive > 1) {
      const forwardedMessage: OlsrTcMessage = {
        ...message,
        senderPeerId: this.peer.id,
        timeToLive: message.timeToLive - 1,
      };
      this.broadcastControlMessage(forwardedMessage, true, message.senderPeerId);
    }

    return true;
  }

  override getRoute(destinationId: UUID): UUID | null {
    const route = this.routingTable.get(destinationId);
    if (!route) return null;

    this.recordEvent(
      EventType.GetRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId: destinationId,
        selectedRoute: route,
      } as GetRouteEventDetails,
      PROTOCOL,
    );

    return route.nextHopPeerId;
  }

  override processRefresh(action: RefreshAction) {
    if (action === RefreshAction.OlsrHello) {
      this.refreshHello();
    } else if (action === RefreshAction.OlsrTc) {
      this.refreshTransactionControl();
    }
  }

  // broadcasts HELLO message and update routing structures
  private refreshHello() {
    this.recomputeMprSet();

    const configuration = this.peer.configuration as OlsrConfiguration;
    const helloMessage: OlsrHelloMessage = {
      type: MessageType.OlsrHelloMessage,
      sourcePeerId: this.peer.id,
      senderPeerId: this.peer.id,
      interval: configuration.helloInterval,
      neighbours: this.graph.getNeighbours(this.peerId).map((neighbour) => neighbour.id),
      mprPeerIds: this.mprSet.toArray(),
    };

    this.broadcastControlMessage(helloMessage, false);
    this.recomputeRoutingTable(helloMessage);
  }

  // broadcasts TC message and update routing structures
  private refreshTransactionControl() {
    if (this.mprSelectorSet.size === 0) {
      const tcMessage: OlsrTcMessage = {
        type: MessageType.OlsrTcMessage,
        sourcePeerId: this.peer.id,
        senderPeerId: this.peer.id,
        ansn: this.ansn,
        timeToLive: OLSR_DEFAULT_TC_TTL,
        advertisedNeighbours: [],
      };

      this.eventRecorder.record(
        this.peer.id,
        EventType.Broadcast,
        {
          neighbourPeerIds: [],
          retransmit: false,
          message: clone(tcMessage),
        },
        PROTOCOL,
      );
      return;
    }

    this.ansn += 1;
    const tcMessage: OlsrTcMessage = {
      type: MessageType.OlsrTcMessage,
      sourcePeerId: this.peer.id,
      senderPeerId: this.peer.id,
      ansn: this.ansn,
      timeToLive: OLSR_DEFAULT_TC_TTL,
      advertisedNeighbours: [...this.mprSelectorSet.values()],
    };

    this.broadcastControlMessage(tcMessage, false);
  }

  override processTick() {
    const tick = this.eventRecorder.getCurrentTick();
    const configuration = this.peer.configuration as OlsrConfiguration;
    const helloExpiry = configuration.helloInterval * 3;
    const tcExpiry = configuration.tcInterval * 3;

    let changed = false;

    for (const [peerId, neighbour] of this.neighbourSet.entries()) {
      if (tick - neighbour.lastUpdateTick > helloExpiry) {
        this.neighbourSet.delete(peerId);
        this.mprSelectorSet.delete(peerId);
        this.mprSet.delete(peerId);
        this.twoHopNeighbourSet.deleteByViaPeerId(peerId);

        changed = true;
      }
    }

    for (const [key, entry] of this.twoHopNeighbourSet.entries()) {
      if (tick - entry.lastUpdateTick > helloExpiry) {
        this.twoHopNeighbourSet.delete(key);
        changed = true;
      }
    }

    for (const [key, topology] of this.topologySet.entries()) {
      if (tick - topology.lastUpdateTick > tcExpiry) {
        this.topologySet.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.recomputeMprSet();
      this.recomputeRoutingTable(null);
    }
  }

  private recomputeMprSet() {
    const symmetricNeighbours = this.getKnownSymmetricNeighbours();
    this.mprSet.clear();

    const directNeighbourIds = new Set(symmetricNeighbours.map((peer) => peer.id));
    const twoHopByNeighbour = new Map<UUID, Set<UUID>>();
    const uncoveredTwoHop = new Set<UUID>();

    for (const neighbour of symmetricNeighbours) {
      const twoHop = new Set<UUID>();
      for (const neighbourOfNeighbour of this.twoHopNeighbourSet.values()) {
        if (
          neighbourOfNeighbour.viaPeerId === neighbour.id &&
          neighbourOfNeighbour.destinationPeerId !== this.peer.id &&
          !directNeighbourIds.has(neighbourOfNeighbour.destinationPeerId)
        ) {
          twoHop.add(neighbourOfNeighbour.destinationPeerId);
          uncoveredTwoHop.add(neighbourOfNeighbour.destinationPeerId);
        }
      }
      twoHopByNeighbour.set(neighbour.id, twoHop);
    }

    for (const twoHopId of [...uncoveredTwoHop]) {
      const candidates = symmetricNeighbours.filter((neighbour) =>
        twoHopByNeighbour.get(neighbour.id)?.has(twoHopId),
      );

      if (candidates.length === 1) {
        this.mprSet.add(candidates[0].id);
      }
    }

    for (const selectedId of this.mprSet.values()) {
      const coverage = twoHopByNeighbour.get(selectedId);
      if (!coverage) {
        continue;
      }
      for (const twoHopId of coverage) {
        uncoveredTwoHop.delete(twoHopId);
      }
    }

    while (uncoveredTwoHop.size > 0) {
      let bestNeighbourId: UUID | null = null;
      let bestCoverage = 0;

      for (const neighbour of symmetricNeighbours) {
        if (this.mprSet.has(neighbour.id)) {
          continue;
        }

        const coverage = [...(twoHopByNeighbour.get(neighbour.id) ?? [])].filter((twoHopId) =>
          uncoveredTwoHop.has(twoHopId),
        ).length;

        if (coverage > bestCoverage) {
          bestCoverage = coverage;
          bestNeighbourId = neighbour.id;
        }
      }

      if (!bestNeighbourId || bestCoverage === 0) {
        break;
      }

      this.mprSet.add(bestNeighbourId);
      const coveredSet = twoHopByNeighbour.get(bestNeighbourId);
      if (coveredSet) {
        for (const twoHopId of coveredSet) {
          uncoveredTwoHop.delete(twoHopId);
        }
      }
    }

    const tick = this.eventRecorder.getCurrentTick();
    for (const neighbour of symmetricNeighbours) {
      this.neighbourSet.set({
        neighbourPeerId: neighbour.id,
        status: this.mprSet.has(neighbour.id) ? "MPR" : "SYMMETRIC",
        lastUpdateTick: tick,
      });
    }
  }

  private recomputeRoutingTable(message: Message | null) {
    const nextRoutes = this.calculateRoutes();
    const previousRoutes = new Map(this.routingTable.entries());

    for (const [destinationPeerId, previousRoute] of previousRoutes.entries()) {
      if (nextRoutes.has(destinationPeerId)) {
        continue;
      }

      this.eventRecorder.record(
        this.peer.id,
        EventType.DeleteRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId,
          nextHopPeerId: previousRoute.nextHopPeerId,
          previousRoute,
          nextRoute: null,
          message: message ? clone(message) : undefined,
        },
        PROTOCOL,
      );
    }

    for (const [destinationPeerId, nextRoute] of nextRoutes.entries()) {
      const previousRoute = previousRoutes.get(destinationPeerId) ?? null;
      if (!previousRoute) {
        this.eventRecorder.record(
          this.peer.id,
          EventType.AddRoute,
          {
            protocol: PROTOCOL,
            destinationPeerId,
            nextHopPeerId: nextRoute.nextHopPeerId,
            previousRoute: null,
            nextRoute,
            message: message ? clone(message) : undefined,
          },
          PROTOCOL,
        );
        continue;
      }

      if (
        previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
        previousRoute.metric !== nextRoute.metric ||
        previousRoute.sequenceNumber !== nextRoute.sequenceNumber
      ) {
        this.eventRecorder.record(
          this.peer.id,
          EventType.UpdateRoute,
          {
            protocol: PROTOCOL,
            destinationPeerId,
            nextHopPeerId: nextRoute.nextHopPeerId,
            previousRoute,
            nextRoute,
            message: message ? clone(message) : undefined,
          },
          PROTOCOL,
        );
      }
    }

    this.routingTable.replaceWith(nextRoutes);

    if (message) {
      this.eventRecorder.record(
        this.peer.id,
        EventType.Calculation,
        {
          message: clone(message),
        },
        PROTOCOL,
      );
    }
  }

  private calculateRoutes(): Map<UUID, OlsrRouteRecord> {
    const routes = new Map<UUID, OlsrRouteRecord>();
    const queue: UUID[] = [];
    const tick = this.eventRecorder.getCurrentTick();

    const directNeighbours = this.getKnownSymmetricNeighbours();

    for (const neighbour of directNeighbours) {
      routes.set(neighbour.id, {
        destinationPeerId: neighbour.id,
        nextHopPeerId: neighbour.id,
        metric: 1,
        sequenceNumber: 0,
        lastUpdateTick: tick,
      });
      queue.push(neighbour.id);
    }

    for (const entry of this.twoHopNeighbourSet.values()) {
      if (routes.has(entry.destinationPeerId) || !this.neighbourSet.has(entry.viaPeerId)) {
        continue;
      }

      routes.set(entry.destinationPeerId, {
        destinationPeerId: entry.destinationPeerId,
        nextHopPeerId: entry.viaPeerId,
        metric: 2,
        sequenceNumber: 0,
        lastUpdateTick: tick,
      });
      queue.push(entry.destinationPeerId);
    }

    while (queue.length > 0) {
      const pivotDestinationId = queue.shift();
      if (!pivotDestinationId) {
        continue;
      }

      const pivotRoute = routes.get(pivotDestinationId);
      if (!pivotRoute) {
        continue;
      }

      for (const entry of this.topologySet.values()) {
        if (entry.lastHopPeerId !== pivotDestinationId) {
          continue;
        }

        if (entry.destinationPeerId === this.peer.id) {
          continue;
        }

        const candidateMetric = pivotRoute.metric + 1;
        const currentRoute = routes.get(entry.destinationPeerId);
        if (!currentRoute || candidateMetric < currentRoute.metric) {
          routes.set(entry.destinationPeerId, {
            destinationPeerId: entry.destinationPeerId,
            nextHopPeerId: pivotRoute.nextHopPeerId,
            metric: candidateMetric,
            sequenceNumber: entry.sequenceNumber,
            lastUpdateTick: tick,
          });
          queue.push(entry.destinationPeerId);
        }
      }
    }

    routes.delete(this.peer.id);
    return routes;
  }

  private broadcastControlMessage(
    message: OlsrHelloMessage | OlsrTcMessage,
    retransmit: boolean,
    excludedPeerId?: UUID,
  ) {
    const neighbours = this.graph
      .getNeighbours(this.peerId)
      .filter((peer) => peer.id !== excludedPeerId);

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit,
        message: clone(message),
      },
      PROTOCOL,
    );

    for (const neighbour of neighbours) {
      super.write(message, neighbour.id);
    }
  }

  private getKnownSymmetricNeighbours() {
    const neighbours: Peer[] = [];

    for (const record of this.neighbourSet.values()) {
      const peer = this.graph.getNode(record.neighbourPeerId);
      if (peer?.protocol === PROTOCOL) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  override getTables() {
    const tables: RoutingStructureType = {} as RoutingStructureType;
    tables[RoutingStructure.OlsrNeighbourTable] = this.neighbourSet.getAll();
    tables[RoutingStructure.OlsrTwoHopTable] = this.twoHopNeighbourSet.getAll();
    tables[RoutingStructure.OlsrSelectorTable] = this.mprSelectorSet.getAll();
    tables[RoutingStructure.OlsrTopologyTable] = this.topologySet.getAll();
    tables[RoutingStructure.OlsrRoutingTable] = this.routingTable.getAll();

    return tables;
  }
}
