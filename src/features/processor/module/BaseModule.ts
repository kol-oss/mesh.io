import { DropReason, EventType, type EventDetails } from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { RefreshAction } from "@/shared/types/model/steps";
import type { EventRecorder } from "../EventRecorder";
import type { NetworkGraph } from "../network/NetworkGraph";
import type { RoutingModule, RoutingStructureType } from "../types/module";
import { clone } from "../utils/clone";
import { isReactive } from "../utils/protocol/protocols";

export abstract class BaseModule implements RoutingModule {
  protected readonly peerId: UUID;
  protected readonly graph: NetworkGraph;
  protected readonly eventRecorder: EventRecorder;

  protected readonly INCOMING_MESSAGE_TYPES: MessageType[] = [MessageType.Packet];

  constructor(peerId: UUID, graph: NetworkGraph, eventRecorder: EventRecorder) {
    this.peerId = peerId;
    this.graph = graph;
    this.eventRecorder = eventRecorder;
  }

  abstract process(message: Message): boolean;

  abstract getRoute(destinationId: UUID): UUID | null;

  abstract getTables(): RoutingStructureType;

  protected get peer() {
    return this.graph.getNode(this.peerId);
  }

  // optional initialization method for modules
  init(): void {}

  // process incoming messages
  read(message: Message): boolean {
    if (!this.peer.active) return false;
    const { type: messageType } = message;

    if (!this.INCOMING_MESSAGE_TYPES.includes(messageType)) {
      return false;
    }

    if (messageType === MessageType.Packet && !isReactive(this.peer.protocol)) {
      return this.processPacket(message as Packet);
    }

    return this.process(message);
  }

  // process routed traffic
  protected processPacket(message: Packet): boolean {
    if (!this.peer.active) return false;

    const { id } = this.peer;
    if (message.destinationPeerId === id) {
      return true;
    }

    const forwarded: Packet = {
      ...message,
      timeToLive: Math.max(0, message.timeToLive - 1),
    };

    if (forwarded.timeToLive <= 0) {
      this.recordEvent(EventType.Drop, {
        message: clone(forwarded),
        reason: DropReason.TimeToLiveExceeded,
      });

      return false;
    }

    const nextHopId = this.getRoute(forwarded.destinationPeerId);
    if (!nextHopId) {
      this.recordEvent(EventType.Drop, {
        message: clone(forwarded),
        reason: DropReason.NoRoute,
      });

      return false;
    }

    return this.write(forwarded, nextHopId);
  }

  // send message to a specific neighbour
  protected write(message: Message, hopPeerId: UUID): boolean {
    if (!this.peer.active) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.DestinationUnavailable,
      });

      return false;
    }

    const hop = this.graph.getNode(hopPeerId);
    if (!hop) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.NoRoute,
      });

      return false;
    }

    if (!hop.active) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.DestinationUnavailable,
      });

      return false;
    }

    const { id, protocol } = this.peer;
    if (hop.protocol !== protocol) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.UnsupportedProtocol,
      });

      return false;
    }

    const forwarded = clone(message);
    if (message.type === MessageType.Packet && message.sourcePeerId === null) {
      const packet = forwarded as Packet;
      packet.sourcePeerId = id;
    }

    if (forwarded.type === MessageType.Packet) {
      this.recordEvent(EventType.Transfer, {
        protocol: protocol,
        sourcePeerId: id,
        targetPeerId: hopPeerId,
        message: clone(forwarded),
      });
    }

    const targetModule = hop.module;
    return targetModule.read(forwarded) ?? false;
  }

  // send message to all neighbours
  protected broadcast(message: Message, retransmit = false): boolean {
    if (!this.peer.active) return false;

    const { protocol } = this.peer;
    const neighbours = this.graph
      .getNeighbours(this.peer.id)
      .filter((peer) => peer.protocol === protocol);

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit: retransmit,
        message: clone(message),
      },
      protocol,
    );

    let broadcastResult = true;
    for (const neighbour of neighbours) {
      const result = this.write(message, neighbour.id);
      broadcastResult = broadcastResult && result;
    }

    return broadcastResult;
  }

  // routes and sends traffic immitation packet
  send(packet: Packet): boolean {
    if (!this.peer.active) {
      this.recordEvent(EventType.Drop, {
        message: clone(packet),
        reason: DropReason.DestinationUnavailable,
      });

      return false;
    }

    const { protocol } = this.peer;

    const { destinationPeerId } = packet;
    const nextHopId = this.getRoute(destinationPeerId);

    if (!nextHopId) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(packet),
          reason: DropReason.NoRoute,
        },
        protocol,
      );

      return false;
    }

    return this.write(packet, nextHopId);
  }

  // optional periodic update method for modules
  refresh(action?: RefreshAction): void {
    if (!this.peer.active) return;

    if (action) {
      this.processRefresh(action);
    } else {
      this.processTick();
    }
  }

  abstract processRefresh(action: RefreshAction): void;

  abstract processTick(): void;

  // record events related to the module's operations
  protected recordEvent(type: EventType, details: EventDetails, protocol?: RoutingProtocol) {
    this.eventRecorder.record(this.peerId, type, details, protocol);
  }
}
