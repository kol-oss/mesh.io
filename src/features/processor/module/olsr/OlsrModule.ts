import { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type OlsrHelloMessage,
  type OlsrNeighbourRecord,
  OlsrNeighbourStatus,
  type OlsrRouteRecord,
  type OlsrTcMessage,
  type OlsrTwoHopRecord,
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
    const {
      sourcePeerId: sourceId,
      senderPeerId: senderId,
      neighbours,
      mprPeerIds: mprSet,
    } = message;
    if (sourceId === this.peerId) {
      return true;
    }

    const tick = this.eventRecorder.getCurrentTick();

    // refresh of one-hop neighbours
    this.neighbourSet.set({
      neighbourPeerId: senderId,
      status: mprSet.includes(this.peerId)
        ? OlsrNeighbourStatus.MultipointRelay
        : OlsrNeighbourStatus.Symmetric,
      lastUpdateTick: tick,
    } satisfies OlsrNeighbourRecord);

    // refresh of two-hop neighbours
    let twoHopCoverageChanged = false;

    this.twoHopNeighbourSet.deleteByViaPeerId(senderId);
    for (const neighbourId of neighbours) {
      if (
        neighbourId === this.peerId ||
        neighbourId === senderId ||
        this.neighbourSet.has(neighbourId)
      ) {
        continue;
      }

      this.twoHopNeighbourSet.set({
        destinationPeerId: neighbourId,
        viaPeerId: senderId,
        lastUpdateTick: tick,
      } satisfies OlsrTwoHopRecord);
      twoHopCoverageChanged = true;
    }

    // refresh of multipoint relay selector set
    if (mprSet.includes(this.peerId)) {
      this.mprSelectorSet.add(senderId, tick);
    } else {
      this.mprSelectorSet.delete(senderId);
    }

    // routes recomputing
    if (twoHopCoverageChanged) {
      this.recomputeMprSet();
      this.recomputeRoutingTable(message);
    }

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
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
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

  private recomputeNeighbourSet(neighbours: Peer[]) {
    const tick = this.eventRecorder.getCurrentTick();

    for (const neighbour of neighbours) {
      const { id: neighbourId } = neighbour;
      this.neighbourSet.set({
        neighbourPeerId: neighbourId,
        status: this.mprSet.has(neighbourId)
          ? OlsrNeighbourStatus.MultipointRelay
          : OlsrNeighbourStatus.Symmetric,
        lastUpdateTick: tick,
      } satisfies OlsrNeighbourRecord);
    }
  }

  private recomputeMprSet() {
    const neighbours = this.getNeighbourNodes();
    const neighbourIds = new Set(neighbours.map((peer) => peer.id));

    const twoHopNeighbours = new Set<UUID>();
    const twoHopByNeighbour = new Map<UUID, Set<UUID>>();

    // cleaning of old MPR Set
    this.mprSet.clear();

    // forming two-hop by one-hop neighbours map
    for (const neighbour of neighbours) {
      const { id: neighbourId } = neighbour;
      const twoHopNeighboursInNeighbour = new Set<UUID>();

      for (const twoHopNeighbour of this.twoHopNeighbourSet.values()) {
        const { destinationPeerId: id, viaPeerId: viaId } = twoHopNeighbour;
        if (viaId === neighbourId && id !== this.peerId && !neighbourIds.has(id)) {
          twoHopNeighbours.add(id);
          twoHopNeighboursInNeighbour.add(id);
        }
      }

      twoHopByNeighbour.set(neighbourId, twoHopNeighboursInNeighbour);
    }

    // adding obvious candidates
    for (const twoHopId of twoHopNeighbours) {
      const candidates = neighbours.filter((neighbour) => {
        const { id: neighbourId } = neighbour;
        return twoHopByNeighbour.get(neighbourId)?.has(twoHopId);
      });

      // if two-hop has only one one-hop candidate, it is added to MPR Set
      if (candidates.length === 1) {
        this.mprSet.add(candidates[0].id);
      }
    }

    // remove one-hop neighbours that are already MPR
    for (const mprId of this.mprSet.values()) {
      const twoHops = twoHopByNeighbour.get(mprId);
      if (!twoHops) {
        continue;
      }

      for (const twoHopId of twoHops) {
        twoHopNeighbours.delete(twoHopId);
      }
    }

    while (twoHopNeighbours.size > 0) {
      let bestNeighbourId: UUID | null = null;
      let bestCoverage = 0;

      for (const neighbour of neighbours) {
        const { id: neighbourId } = neighbour;

        // neighbour is already MPR, so skip
        if (this.mprSet.has(neighbourId)) {
          continue;
        }

        // calculate how much nodes are reachable from this neighbour
        const coverage = [...(twoHopByNeighbour.get(neighbourId) ?? [])].filter((twoHopId) =>
          twoHopNeighbours.has(twoHopId),
        ).length;

        if (coverage > bestCoverage) {
          bestCoverage = coverage;
          bestNeighbourId = neighbourId;
        }
      }

      if (!bestNeighbourId || bestCoverage === 0) {
        break;
      }

      // adding node to the MPR Set
      this.mprSet.add(bestNeighbourId);

      // remove covered nodes
      const coveredSet = twoHopByNeighbour.get(bestNeighbourId);
      if (coveredSet) {
        for (const twoHopId of coveredSet) {
          twoHopNeighbours.delete(twoHopId);
        }
      }

      // recompute neighbour statuses
      this.recomputeNeighbourSet(neighbours);
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

    const directNeighbours = this.getNeighbourNodes();

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

  // returns nodes of nodes in neighbour set
  private getNeighbourNodes() {
    const neighbours: Peer[] = [];

    for (const record of this.neighbourSet.values()) {
      const peer = this.graph.getNode(record.neighbourPeerId);
      neighbours.push(peer);
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
