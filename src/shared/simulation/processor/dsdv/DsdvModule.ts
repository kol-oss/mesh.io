import { RoutingProtocol } from "../../types/enums";import {
  DsdvUpdateType,
  SimulationEventType,
  SimulationMessageKind,
  type DsdvRouteEntryMessage,
  type DsdvRouteUpdateMessage,
  type SimulationPacket,
} from "../../types/simulation";
import type { UUID } from "../../types/uuid";
import { SimulationEventRecorder } from "../core/EventRecorder";
import type { PacketCapableModule, SimulationPeerNode } from "../core/runtimeTypes";
import { DsdvRoutingTable } from "./DsdvRoutingTable";
import { cloneDsdvMessage, isDsdvSimulationMessage } from "./dsdvMessage";
import {
  DSDV_MAX_INTERVAL,
  DSDV_MAX_TIMEOUT,
  DSDV_METRIC_INFINITY,
  DSDV_MIN_INTERVAL,
  DSDV_MIN_TIMEOUT,
  DSDV_SEQUENCE_INITIAL,
} from "../../constants/dsdv";

const clampInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(DSDV_MIN_INTERVAL, Math.min(DSDV_MAX_INTERVAL, normalized));
};

const clampTimeout = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(DSDV_MIN_TIMEOUT, Math.min(DSDV_MAX_TIMEOUT, normalized));
};

export class DsdvModule implements PacketCapableModule {
  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private readonly routingTable: DsdvRoutingTable;

  private ownSequenceNumber = DSDV_SEQUENCE_INITIAL;

  private hasSentFullDump = false;

  private lastIncrementalBroadcastTick = 0;

  private readonly fullDumpTimingByNeighbour = new Map<
    UUID,
    { lastTick: number; interval: number }
  >();

  constructor(routingPeer: SimulationPeerNode, eventRecorder: SimulationEventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
    this.routingTable = new DsdvRoutingTable({
      routingPeer,
      eventRecorder,
      getRouteTimeout: () => clampTimeout(this.routingPeer.getPeerEntity().dsdvRouteTimeout),
      getRouteExpiryTick: (nextHopPeerId, fallbackTick) => {
        const fullDumpTiming = this.fullDumpTimingByNeighbour.get(nextHopPeerId);
        const fullDumpInterval =
          fullDumpTiming?.interval ??
          clampInterval(this.routingPeer.getPeerEntity().dsdvFullDumpInterval);
        const routeTimeout = clampTimeout(this.routingPeer.getPeerEntity().dsdvRouteTimeout);
        const lastFullDumpTick = fullDumpTiming?.lastTick ?? fallbackTick;
        return lastFullDumpTick + fullDumpInterval + routeTimeout;
      },
    });

    this.routingTable.upsertSelfRoute(this.ownSequenceNumber);
    this.routingTable.clearChangedFlags();
    this.lastIncrementalBroadcastTick = this.eventRecorder.getCurrentTick();
  }

  read(message: unknown): boolean {
    if (!isDsdvSimulationMessage(message)) {
      return false;
    }

    if (message.kind === SimulationMessageKind.Packet) {
      if (message.destinationPeerId === this.routingPeer.id) {
        return true;
      }

      const forwardedPacket: SimulationPacket = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.routeAndWrite(forwardedPacket);
    }

    if (message.kind !== SimulationMessageKind.DsdvRouteUpdateMessage) {
      return false;
    }

    return this.processRouteUpdate(message);
  }

  refresh() {
    this.refreshIncremental();
  }

  refreshFullDump() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    if (this.hasSentFullDump) {
      this.ownSequenceNumber += 2;
      this.routingTable.upsertSelfRoute(this.ownSequenceNumber);
    }

    this.broadcastRouteUpdate({
      updateType: DsdvUpdateType.FullDump,
      retransmit: false,
      note: "Full dump includes all current routing table entries.",
    });
    this.hasSentFullDump = true;
  }

  refreshIncremental() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    // Increment sequence number on any changes to broadcast
    const changedRoutes = this.routingTable.getChangedRoutes();
    if (changedRoutes.length > 0) {
      this.ownSequenceNumber += 2;
      this.routingTable.upsertSelfRoute(this.ownSequenceNumber);
    }

    this.broadcastRouteUpdate({
      updateType: DsdvUpdateType.Incremental,
      retransmit: false,
      note: `Incremental update includes routes changed since tick ${this.lastIncrementalBroadcastTick}.`,
    });
  }

  tick() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.routingTable.tick();
  }

  send(packet: SimulationPacket) {
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsdvMessage(packet),
        reason: "Source peer is disabled",
      });
      return false;
    }

    return this.routeAndWrite(packet);
  }

  getRoutes() {
    return this.routingTable.getRoutes();
  }

  private processRouteUpdate(message: DsdvRouteUpdateMessage) {
    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    const sender = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.DSDV)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsdvMessage(message),
        reason: "Selected next hop does not support DSDV",
      });
      return false;
    }

    if (message.updateType === DsdvUpdateType.FullDump) {
      this.fullDumpTimingByNeighbour.set(message.senderPeerId, {
        lastTick: this.eventRecorder.getCurrentTick(),
        interval: clampInterval(sender.getPeerEntity().dsdvFullDumpInterval),
      });
    }

    const acceptedDestinations: UUID[] = [];
    for (const entry of message.entries) {
      const accepted = this.routingTable.processIncomingEntry({
        senderPeerId: message.senderPeerId,
        destinationPeerId: entry.destinationPeerId,
        incomingMetric: Math.min(DSDV_METRIC_INFINITY, entry.metric + 1),
        incomingSequenceNumber: entry.sequenceNumber,
        message,
      });

      if (accepted) {
        acceptedDestinations.push(entry.destinationPeerId);
      }
    }

    if (acceptedDestinations.length === 0) {
      return true;
    }

    const acceptedSet = new Set(acceptedDestinations);
    const retransmitEntries = this.routingTable
      .getRoutes()
      .filter((route) => acceptedSet.has(route.destinationPeerId))
      .map(
        (route): DsdvRouteEntryMessage => ({
          destinationPeerId: route.destinationPeerId,
          nextHopPeerId: route.nextHopPeerId,
          sequenceNumber: route.sequenceNumber,
          metric: route.metric,
        }),
      );

    if (retransmitEntries.length > 0) {
      this.broadcastRouteUpdate({
        updateType: message.updateType,
        retransmit: true,
        sourcePeerId: message.sourcePeerId,
        hopCount: message.hopCount + 1,
        entries: retransmitEntries,
        note: `Retransmitted ${message.updateType === DsdvUpdateType.Incremental ? "incremental" : "full dump"} update with hop count ${message.hopCount + 1}.`,
      });
    }

    return true;
  }

  private routeAndWrite(packet: SimulationPacket) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsdvMessage(packet),
        reason: "Packet TTL reached zero",
      });
      return false;
    }

    const selectedRoute = this.routingTable.getBestRoute(packet.destinationPeerId);
    if (!selectedRoute) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        reason: "No DSDV route is available for the destination",
        reasonCode: "NO_ROUTE",
      });
      return false;
    }

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemRouteSelected, {
      protocol: RoutingProtocol.DSDV,
      destinationPeerId: packet.destinationPeerId,
      selectedRoute,
      message: cloneDsdvMessage(packet),
    });

    return this.write(packet, selectedRoute.nextHopPeerId);
  }

  private write(message: SimulationPacket | DsdvRouteUpdateMessage, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsdvMessage(message),
        reason: "Selected next hop is not a current neighbour",
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.DSDV)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsdvMessage(message),
        reason: "Selected next hop does not support DSDV",
      });
      return false;
    }

    const forwardedMessage =
      message.kind === SimulationMessageKind.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : cloneDsdvMessage(message);

    const targetModule = hop.getModule(RoutingProtocol.DSDV);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  private broadcastRouteUpdate(params: {
    updateType: DsdvUpdateType;
    retransmit: boolean;
    sourcePeerId?: UUID;
    hopCount?: number;
    entries?: DsdvRouteEntryMessage[];
    note: string;
  }) {
    const routes =
      params.entries ??
      (params.updateType === DsdvUpdateType.FullDump
        ? this.routingTable.getRoutes().map(
            (route): DsdvRouteEntryMessage => ({
              destinationPeerId: route.destinationPeerId,
              nextHopPeerId: route.nextHopPeerId,
              sequenceNumber: route.sequenceNumber,
              metric: route.metric,
            }),
          )
        : this.routingTable.getChangedRoutes().map(
            (route): DsdvRouteEntryMessage => ({
              destinationPeerId: route.destinationPeerId,
              nextHopPeerId: route.nextHopPeerId,
              sequenceNumber: route.sequenceNumber,
              metric: route.metric,
            }),
          ));

    if (routes.length === 0) {
      if (params.updateType === DsdvUpdateType.Incremental && !params.retransmit) {
        const emptyIncrementalMessage: DsdvRouteUpdateMessage = {
          kind: SimulationMessageKind.DsdvRouteUpdateMessage,
          updateType: DsdvUpdateType.Incremental,
          sourcePeerId: this.routingPeer.id,
          senderPeerId: this.routingPeer.id,
          hopCount: 0,
          entries: [],
        };

        this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
          neighbourPeerIds: [],
          retransmit: false,
          message: cloneDsdvMessage(emptyIncrementalMessage),
          note: "No changes since last incremental update, no traffic sent.",
        });

        this.lastIncrementalBroadcastTick = this.eventRecorder.getCurrentTick();
      }
      return;
    }

    const neighbours = this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.DSDV));

    const message: DsdvRouteUpdateMessage = {
      kind: SimulationMessageKind.DsdvRouteUpdateMessage,
      updateType: params.updateType,
      sourcePeerId: params.sourcePeerId ?? this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      hopCount: params.hopCount ?? 0,
      entries: routes,
    };

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
      neighbourPeerIds: neighbours.map((peer) => peer.id),
      retransmit: params.retransmit,
      message: cloneDsdvMessage(message),
      note: params.note,
    });

    for (const neighbour of neighbours) {
      this.write(message, neighbour.id);
    }

    if (!params.retransmit) {
      this.routingTable.clearChangedFlags();
      if (params.updateType === DsdvUpdateType.Incremental) {
        this.lastIncrementalBroadcastTick = this.eventRecorder.getCurrentTick();
      }
    }
  }
}
