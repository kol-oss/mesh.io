import { EventRecorder } from "@/features/processor/EventRecorder";
import type { NodeWrapper } from "@/features/processor/types/node";
import {
  DsdvUpdateType,
  type DsdvRouteRecord,
  type DsdvRouteUpdateMessage,
  type DsdvRouteUpdateRecordEntry,
} from "@/features/processor/types/protocols/dsdv";
import {
  DSDV_METRIC_INFINITY,
  DSDV_MIN_INTERVAL,
  DSDV_MIN_TIMEOUT,
  DSDV_SEQUENCE_INITIAL,
} from "@/shared/constants/protocols/dsdv";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { DsdvConfiguration } from "@/shared/types/model/configurations";
import { BaseModule } from "../BaseModule";
import { DsdvRoutingTable } from "./structures/DsdvRoutingTable";

const PROTOCOL = RoutingProtocol.DSDV;

const clampInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(DSDV_MIN_INTERVAL, normalized);
};

const clampTimeout = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(DSDV_MIN_TIMEOUT, normalized);
};

export class DsdvModule extends BaseModule {
  private readonly routingTable: DsdvRoutingTable;

  private ownSequenceNumber = DSDV_SEQUENCE_INITIAL;

  private hasSentFullDump = false;

  constructor(node: NodeWrapper, eventRecorder: EventRecorder) {
    super(node, eventRecorder);

    const configuration = node.getConfiguration() as DsdvConfiguration;
    this.routingTable = new DsdvRoutingTable({
      routingPeer: node,
      eventRecorder,
      routeTimeout: clampTimeout(configuration.routeTimeout),
      fullDumpInterval: clampInterval(configuration.fullDumpInterval),
    });

    this.routingTable.upsertSelfRoute(this.ownSequenceNumber);
    this.routingTable.clearChangedFlags();
  }

  override read(message: Message): boolean {
    const { type: messageType } = message;
    if (messageType === MessageType.Packet) {
      return super.read(message);
    }

    // Full or Incremental Route Update message
    if (messageType !== MessageType.DsdvRouteUpdateMessage) {
      return false;
    }

    return this.processRouteUpdate(message);
  }

  private processRouteUpdate(message: DsdvRouteUpdateMessage) {
    if (message.sourcePeerId === this.node.id) {
      this.recordEvent(EventType.Drop, {
        message: { ...message },
        reason: DropReason.SourceIsTarget,
      });

      return false;
    }

    const sender = this.node.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(PROTOCOL)) {
      this.recordEvent(EventType.Drop, {
        message: { ...message },
        reason: DropReason.UnsupportedProtocol,
      });

      return false;
    }

    if (message.updateType === DsdvUpdateType.FullDump) {
      const senderPeer = sender.getEntity();
      const senderConfiguration = senderPeer.configuration as DsdvConfiguration;
      if (!senderConfiguration) {
        return false;
      }

      this.routingTable.updateNeighbourFullDumpTiming(
        message.senderPeerId,
        this.eventRecorder.getCurrentTick(),
        clampInterval(senderConfiguration.fullDumpInterval),
      );
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
        (route): DsdvRouteUpdateRecordEntry => ({
          destinationPeerId: route.destinationPeerId,
          nextHopPeerId: route.nextHopPeerId,
          sequenceNumber: route.sequenceNumber,
          metric: route.metric,
        }),
      );

    if (retransmitEntries.length > 0) {
      return this.broadcastRouteUpdate({
        updateType: message.updateType,
        retransmit: true,
        sourcePeerId: message.sourcePeerId,
        hopCount: message.hopCount + 1,
        entries: retransmitEntries,
      });
    }

    return true;
  }

  override getRoute(destinationId: UUID): UUID | null {
    const selectedRoute = this.routingTable.getBestRoute(destinationId);
    if (selectedRoute) {
      this.recordEvent(
        EventType.GetRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId: destinationId,
          selectedRoute,
        } as GetRouteEventDetails,
        PROTOCOL,
      );
    }

    return selectedRoute?.nextHopPeerId ?? null;
  }

  override tick() {
    super.tick();
    if (!this.node.isActive()) {
      return;
    }

    this.routingTable.tick();
  }

  override refresh() {
    super.refresh();

    this.refreshIncremental();
  }

  refreshFullDump() {
    super.refresh();
    if (!this.node.isActive()) {
      return;
    }

    if (this.hasSentFullDump) {
      this.ownSequenceNumber += 2;
      this.routingTable.upsertSelfRoute(this.ownSequenceNumber);
    }

    this.broadcastRouteUpdate({
      updateType: DsdvUpdateType.FullDump,
      retransmit: false,
    });
    this.hasSentFullDump = true;
  }

  refreshIncremental() {
    super.refresh();
    if (!this.node.isActive()) {
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
    });
  }

  getRoutes() {
    return this.routingTable.getRoutes();
  }

  private toRouteUpdateEntries(routes: DsdvRouteRecord[]): DsdvRouteUpdateRecordEntry[] {
    return routes.map(
      (route): DsdvRouteUpdateRecordEntry => ({
        destinationPeerId: route.destinationPeerId,
        nextHopPeerId: route.nextHopPeerId,
        sequenceNumber: route.sequenceNumber,
        metric: route.metric,
      }),
    );
  }

  private broadcastRouteUpdate(params: {
    updateType: DsdvUpdateType;
    retransmit: boolean;
    sourcePeerId?: UUID;
    hopCount?: number;
    entries?: DsdvRouteUpdateRecordEntry[];
  }): boolean {
    const routes =
      params.entries ??
      (params.updateType === DsdvUpdateType.FullDump
        ? this.toRouteUpdateEntries(this.routingTable.getRoutes())
        : this.toRouteUpdateEntries(this.routingTable.getChangedRoutes()));

    if (routes.length === 0) {
      if (params.updateType === DsdvUpdateType.Incremental && !params.retransmit) {
        const emptyIncrementalMessage: DsdvRouteUpdateMessage = {
          type: MessageType.DsdvRouteUpdateMessage,
          updateType: DsdvUpdateType.Incremental,
          sourcePeerId: this.node.id,
          senderPeerId: this.node.id,
          hopCount: 0,
          entries: [],
        };

        this.recordEvent(
          EventType.Broadcast,
          {
            neighbourPeerIds: [],
            retransmit: false,
            message: { ...emptyIncrementalMessage },
          },
          PROTOCOL,
        );
      }
      return false;
    }

    const neighbours = this.node.getNeighbours().filter((peer) => peer.supports(PROTOCOL));

    const message: DsdvRouteUpdateMessage = {
      type: MessageType.DsdvRouteUpdateMessage,
      updateType: params.updateType,
      sourcePeerId: params.sourcePeerId ?? this.node.id,
      senderPeerId: this.node.id,
      hopCount: params.hopCount ?? 0,
      entries: routes,
    };

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit: params.retransmit,
        message: { ...message },
      },
      PROTOCOL,
    );

    for (const neighbour of neighbours) {
      super.write(message, neighbour.id);
    }

    if (!params.retransmit) {
      this.routingTable.clearChangedFlags();
    }

    return true;
  }
}
