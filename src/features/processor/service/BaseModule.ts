import { EventType, type EventDetails } from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
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

  abstract getRoute(destinationPeerId: UUID): UUID | null;

  // process incoming messages
  read(message: Message): boolean {
    if (!this.peer.isActive()) return false;
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
    if (!this.peer.isActive()) return false;

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
    if (!this.peer.isActive()) return false;

    const hop = this.peer.getNeighbour(hopPeerId);
    if (!hop) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: "Unknown next hop",
      });

      return false;
    }

    if (!hop.isActive()) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: "Next hop is inactive",
      });

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

  // send message to all neighbours
  protected broadcast(message: Message, retransmit = false): boolean {
    if (!this.peer.isActive()) return false;

    const { protocol } = this.peer.getEntity();
    const neighbours = this.peer.getNeighbours().filter((peer) => peer.supports(protocol));

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
    const { destinationPeerId } = packet;
    const nextHopId = this.getRoute(destinationPeerId);

    if (!nextHopId) {
      this.recordEvent(EventType.Drop, {
        message: clone(packet),
        reason: "No route to destination",
      });

      return false;
    }

    return this.write(packet, nextHopId);
  }

  protected recordEvent(type: EventType, details: EventDetails, protocol?: RoutingProtocol) {
    this.eventRecorder.record(this.peer.id, type, details, protocol);
  }

  refresh(): void {
    if (!this.peer.isActive()) return;
  }

  tick(): void {
    if (!this.peer.isActive()) return;
  }
}
