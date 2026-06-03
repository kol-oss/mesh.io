import { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type OlsrCalculationEventDetails,
  OlsrChangeEventDetailsType,
  type OlsrHelloMessage,
  type OlsrNeighbourChangeEventDetails,
  type OlsrNeighbourRecord,
  OlsrNeighbourStatus,
  type OlsrRouteChangeEventDetails,
  type OlsrRouteRecord,
  type OlsrTcMessage,
  type OlsrTopologyRecord,
  type OlsrTwoHopRecord,
} from "@/features/processor/types/protocols/olsr";
import { OLSR_DEFAULT_TC_TTL } from "@/shared/constants/protocols/olsr";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events";
import { type Message, MessageType } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { OlsrConfiguration } from "@/shared/types/model/configurations";
import { RefreshAction } from "@/shared/types/model/steps.ts";
import type { NetworkGraph } from "../../network/NetworkGraph";
import { RoutingStructure, type RoutingStructureType } from "../../types/module";
import type { Peer } from "../../types/network/peer";
import { clone } from "../../utils/clone";
import { BaseModule } from "../BaseModule";
import { MultipointRelaySelectorSet } from "./structures/MultipointRelaySelectorSet.ts";
import { MultipointRelaySet } from "./structures/MultipointRelaySet.ts";
import { NeighbourSet } from "./structures/NeighbourSet.ts";
import { RoutingTable } from "./structures/RoutingTable";
import { TopologySet } from "./structures/TopologySet.ts";
import { TwoHopNeighbourSet } from "./structures/TwoHopNeighbourSet.ts";

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
    const neighbour = {
      neighbourPeerId: senderId,
      status: mprSet.includes(this.peerId)
        ? OlsrNeighbourStatus.MultipointRelay
        : OlsrNeighbourStatus.Symmetric,
      lastUpdateTick: tick,
    } satisfies OlsrNeighbourRecord;
    this.neighbourSet.set(neighbour);

    // refresh of two-hop neighbours
    const updatedTwoHopNeighbours = [];

    this.twoHopNeighbourSet.deleteByViaPeerId(senderId);
    for (const neighbourId of neighbours) {
      if (
        neighbourId === this.peerId ||
        neighbourId === senderId ||
        this.neighbourSet.has(neighbourId)
      ) {
        continue;
      }

      const record = {
        destinationPeerId: neighbourId,
        viaPeerId: senderId,
        lastUpdateTick: tick,
      } satisfies OlsrTwoHopRecord;
      this.twoHopNeighbourSet.set(record);
      updatedTwoHopNeighbours.push(record);
    }

    super.recordEvent(
      EventType.AddRoute,
      {
        type: OlsrChangeEventDetailsType.NEIGHBOUR,
        protocol: PROTOCOL,
        message: message,
        neighbour: neighbour,
        twoHopNeighbours: updatedTwoHopNeighbours,
      } satisfies OlsrNeighbourChangeEventDetails,
      PROTOCOL,
    );

    // refresh of multipoint relay selector set
    if (mprSet.includes(this.peerId)) {
      this.mprSelectorSet.add(senderId, tick);
    } else {
      this.mprSelectorSet.delete(senderId);
    }

    // routes recomputing
    if (updatedTwoHopNeighbours.length > 0) {
      this.recomputeMprSet();
      this.recomputeRoutingTable(message);
    }

    return true;
  }

  private processTransactionControl(message: OlsrTcMessage) {
    const { sourcePeerId: sourceId, ansn, advertisedNeighbours: neighbours, timeToLive } = message;
    if (sourceId === this.peerId) {
      return true;
    }

    // ansn validation
    const previousAnsn = this.lastTcSequenceByOriginator.get(sourceId) ?? -1;
    if (ansn <= previousAnsn) {
      return true;
    }

    this.lastTcSequenceByOriginator.set(sourceId, ansn);
    this.topologySet.deleteByLastHopPeerId(sourceId);

    const tick = this.eventRecorder.getCurrentTick();
    const topologyRecords: OlsrTopologyRecord[] = [];
    for (const destinationId of neighbours) {
      if (destinationId === this.peerId) continue;

      const topologyRecord = {
        destinationPeerId: destinationId,
        lastHopPeerId: sourceId,
        sequenceNumber: ansn,
        lastUpdateTick: tick,
      } satisfies OlsrTopologyRecord;

      this.topologySet.set(topologyRecord);
      topologyRecords.push(topologyRecord);
    }

    // routing table recomping
    this.recomputeRoutingTable(message, topologyRecords);

    // transaction control rebroadcast
    if (this.mprSelectorSet.size > 0 && timeToLive > 1) {
      const forwardedMessage = {
        ...message,
        senderPeerId: this.peerId,
        timeToLive: timeToLive - 1,
      } satisfies OlsrTcMessage;

      this.broadcastControlMessage(forwardedMessage, true);
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
    const configuration = this.peer.configuration as OlsrConfiguration;

    // recomputing MPR set
    this.recomputeMprSet();

    // broadcasting of HELLO message
    const helloMessage: OlsrHelloMessage = {
      type: MessageType.OlsrHelloMessage,
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
      interval: configuration.helloInterval,
      neighbours: this.graph.getNeighbours(this.peerId).map((neighbour) => neighbour.id),
      mprPeerIds: this.mprSet.toArray(),
    };

    this.broadcastControlMessage(helloMessage, false);

    // recomputing of routing table
    this.recomputeRoutingTable(helloMessage);
  }

  // broadcasts TC message and update routing structures
  private refreshTransactionControl() {
    // if node is not MPR for any other nodes, then just skip
    if (this.mprSelectorSet.size === 0) {
      super.recordEvent(
        EventType.Drop,
        {
          reason: DropReason.Skip,
        },
        PROTOCOL,
      );

      return;
    }

    // transaction control broadcase
    this.ansn += 1;
    const tcMessage: OlsrTcMessage = {
      type: MessageType.OlsrTcMessage,
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
      ansn: this.ansn,
      timeToLive: OLSR_DEFAULT_TC_TTL,
      advertisedNeighbours: [...this.mprSelectorSet.values()],
    } satisfies OlsrTcMessage;

    this.broadcastControlMessage(tcMessage, false);
  }

  override processTick() {
    const configuration = this.peer.configuration as OlsrConfiguration;
    const tick = this.eventRecorder.getCurrentTick();

    const routeExpiry = configuration.routeTimeout;

    let changed = false;

    for (const [peerId, neighbour] of this.neighbourSet.entries()) {
      if (tick - neighbour.lastUpdateTick > routeExpiry) {
        this.neighbourSet.delete(peerId);
        this.mprSelectorSet.delete(peerId);
        this.mprSet.delete(peerId);
        this.twoHopNeighbourSet.deleteByViaPeerId(peerId);

        changed = true;
      }
    }

    for (const [key, entry] of this.twoHopNeighbourSet.entries()) {
      if (tick - entry.lastUpdateTick > routeExpiry) {
        this.twoHopNeighbourSet.delete(key);
        changed = true;
      }
    }

    for (const [key, topology] of this.topologySet.entries()) {
      if (tick - topology.lastUpdateTick > routeExpiry) {
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

    const nodesByNeighbours = new Map<UUID, Set<UUID>>();

    // adding obvious candidates
    for (const twoHopId of twoHopNeighbours) {
      const candidates = neighbours.filter((neighbour) => {
        const { id: neighbourId } = neighbour;
        return twoHopByNeighbour.get(neighbourId)?.has(twoHopId);
      });

      // if two-hop has only one one-hop candidate, it is added to MPR Set
      if (candidates.length === 1) {
        const candidateId = candidates[0].id;

        this.mprSet.add(candidateId);
        const coveredNodes = nodesByNeighbours.get(candidateId) ?? new Set<UUID>();
        coveredNodes.add(twoHopId);
        nodesByNeighbours.set(candidateId, coveredNodes);
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
      let bestCoveredNeighbours: UUID[] = [];

      for (const neighbour of neighbours) {
        const { id: neighbourId } = neighbour;

        // neighbour is already MPR, so skip
        if (this.mprSet.has(neighbourId)) {
          continue;
        }

        // calculate how much nodes are reachable from this neighbour
        const twoHopCoveredNeighbours = [...(twoHopByNeighbour.get(neighbourId) ?? [])].filter(
          (twoHopId) => twoHopNeighbours.has(twoHopId),
        );
        const coverage = twoHopCoveredNeighbours.length;

        if (coverage > bestCoverage) {
          bestCoverage = coverage;
          bestNeighbourId = neighbourId;
          bestCoveredNeighbours = twoHopCoveredNeighbours;
        }
      }

      if (!bestNeighbourId || bestCoverage === 0) {
        break;
      }

      // adding node to the MPR Set
      this.mprSet.add(bestNeighbourId);

      if (!nodesByNeighbours.has(bestNeighbourId)) {
        nodesByNeighbours.set(bestNeighbourId, new Set(bestCoveredNeighbours));
      } else {
        const nodesByNeighbour = nodesByNeighbours.get(bestNeighbourId)!;
        for (const twoHopNeighbour of bestCoveredNeighbours) {
          nodesByNeighbour.add(twoHopNeighbour);
        }
      }

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

    if (nodesByNeighbours.size > 0) {
      super.recordEvent(
        EventType.Calculation,
        {
          nodesByNeighbours,
        } satisfies OlsrCalculationEventDetails,
        PROTOCOL,
      );
    }
  }

  private recomputeRoutingTable(message: Message | null, records: OlsrTopologyRecord[] = []) {
    // calculating new routes based on neighbours and topology
    const routes = this.recomputeRoutes();

    // cleaning old routes
    const removedRoutes: OlsrRouteRecord[] = [];
    for (const [destinationId, removedRoute] of this.routingTable.entries()) {
      if (routes.has(destinationId)) {
        continue;
      }

      removedRoutes.push(removedRoute);
    }

    if (removedRoutes.length > 0) {
      super.recordEvent(
        EventType.DeleteRoute,
        {
          type: OlsrChangeEventDetailsType.ROUTE,
          protocol: PROTOCOL,
          topologyRecords: [],
          routes: [...removedRoutes.values()],
          message: message ? clone(message) : undefined,
        } satisfies OlsrRouteChangeEventDetails,
        PROTOCOL,
      );
    }

    // adding new routes
    if (routes.size > 0) {
      super.recordEvent(
        EventType.AddRoute,
        {
          type: OlsrChangeEventDetailsType.ROUTE,
          protocol: PROTOCOL,
          topologyRecords: records,
          message: message ? clone(message) : undefined,
          routes: [...routes.values()],
        } satisfies OlsrRouteChangeEventDetails,
        PROTOCOL,
      );
    }

    // replacing routing table content
    this.routingTable.replaceWith(routes);
  }

  // compute routes by Breadth-First Search algorithm
  private recomputeRoutes(): Map<UUID, OlsrRouteRecord> {
    const routes = new Map<UUID, OlsrRouteRecord>();
    const queue: UUID[] = [];
    const tick = this.eventRecorder.getCurrentTick();

    // one-hop neighbours
    const neighbours = this.getNeighbourNodes();
    for (const neighbour of neighbours) {
      const { id: neighbourId } = neighbour;
      routes.set(neighbourId, {
        destinationPeerId: neighbourId,
        nextHopPeerId: neighbourId,
        metric: 1,
        sequenceNumber: 0,
        lastUpdateTick: tick,
      });

      queue.push(neighbourId);
    }

    // two-hop neighbours
    for (const twoHopNeighbour of this.twoHopNeighbourSet.values()) {
      const { destinationPeerId: destinationId, viaPeerId: viaId } = twoHopNeighbour;
      if (routes.has(destinationId) || !this.neighbourSet.has(viaId)) {
        continue;
      }

      routes.set(destinationId, {
        destinationPeerId: destinationId,
        nextHopPeerId: viaId,
        metric: 2,
        sequenceNumber: 0,
        lastUpdateTick: tick,
      } satisfies OlsrRouteRecord);

      queue.push(destinationId);
    }

    // remote routes from topology set
    while (queue.length > 0) {
      const pivotId = queue.shift();
      if (!pivotId) {
        continue;
      }

      const pivotRoute = routes.get(pivotId);
      if (!pivotRoute) {
        continue;
      }

      // find routes in topology by already added route
      for (const entry of this.topologySet.values()) {
        const {
          lastHopPeerId: lastHopId,
          destinationPeerId: destinationId,
          sequenceNumber: sequence,
        } = entry;
        if (lastHopId !== pivotId) {
          continue;
        }

        if (destinationId === this.peerId) {
          continue;
        }

        const candidateMetric = pivotRoute.metric + 1;
        const route = routes.get(destinationId);

        if (!route || candidateMetric < route.metric) {
          routes.set(destinationId, {
            destinationPeerId: destinationId,
            nextHopPeerId: pivotRoute.nextHopPeerId,
            metric: candidateMetric,
            sequenceNumber: sequence,
            lastUpdateTick: tick,
          });

          queue.push(destinationId);
        }
      }
    }

    routes.delete(this.peerId);
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
    tables[RoutingStructure.OlsrNeighbourSet] = this.neighbourSet.getAll();
    tables[RoutingStructure.OlsrTwoHopNeighbourSet] = this.twoHopNeighbourSet.getAll();
    tables[RoutingStructure.OlsrMultipointRelaySet] = this.mprSet.toArray();
    tables[RoutingStructure.OlsrSelectorSet] = this.mprSelectorSet.getAll();
    tables[RoutingStructure.OlsrTopologySet] = this.topologySet.getAll();
    tables[RoutingStructure.OlsrRoutingTable] = this.routingTable.getAll();

    return tables;
  }
}
