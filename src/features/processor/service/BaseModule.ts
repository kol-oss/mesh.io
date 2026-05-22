import { EventType, type EventDetails } from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import type { UUID } from "@/shared/types/common/uuid";
import type { EventRecorder } from "../EventRecorder";
import type { PeerNode, RoutingModule } from "../types/runtime";
import { clone } from "../utils/messages";

export abstract class BaseModule implements RoutingModule {
  protected readonly peer: PeerNode;
  protected readonly eventRecorder: EventRecorder;

  protected readonly INCOMING_MESSAGE_TYPES: MessageType[] = [MessageType.Packet];

  constructor(peer: PeerNode, eventRecorder: EventRecorder) {
    this.peer = peer;
    this.eventRecorder = eventRecorder;
  }

  // process incoming messages
  read(message: Message): boolean {
    const { type: messageType } = message;

    if (!this.INCOMING_MESSAGE_TYPES.includes(messageType)) {
      return false;
    }

    if (messageType === MessageType.Packet) {
      return this.processPacket(message as Packet);
    }

    return true;
  }

  // process routed traffic
  protected processPacket(message: Packet): boolean {
    const { id } = this.peer.getEntity();
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
        reason: "Packet TTL reached zero",
      });

      return false;
    }

    const nextHopId = this.getRoute(forwarded.destinationPeerId);
    if (!nextHopId) {
      this.recordEvent(EventType.Drop, {
        message: clone(forwarded),
        reason: "No route to destination",
      });

      return false;
    }

    return this.write(forwarded, nextHopId);
  }

  // send message to a specific neighbour
  protected write(message: Message, hopPeerId: UUID): boolean {
    const hop = this.peer.getNeighbour(hopPeerId);
    if (!hop) {
      return false;
    }

    const { id, protocol } = this.peer.getEntity();
    if (!hop.supports(protocol)) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: "Unsupported protocol",
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

    const targetModule = hop.getModule(protocol);
    return targetModule?.read(forwarded) ?? false;
  }

  protected recordEvent(type: EventType, details: EventDetails) {
    this.eventRecorder.record(this.peer.id, type, details);
  }

  abstract getRoute(destinationPeerId: UUID): UUID | null;
  abstract send(packet: Packet): boolean;
  abstract refresh(): void;
  abstract tick(): void;
}
