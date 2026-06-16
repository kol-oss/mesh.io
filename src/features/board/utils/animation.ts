import type { OlsrNeighbourChangeEventDetails } from "@/features/processor/types/protocols/olsr.ts";
import { OlsrChangeEventDetailsType } from "@/features/processor/types/protocols/olsr.ts";
import type {
  BroadcastEventDetails,
  Event,
  MoveEventDetails,
  RouteChangeEventDetails,
  StatusChangeEventDetails,
  TransferEventDetails,
} from "@/shared/types/common/events.ts";
import { EventType } from "@/shared/types/common/events.ts";
import type { Message } from "@/shared/types/common/messages.ts";
import { MessageType } from "@/shared/types/common/messages.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities.ts";
import { EntityType } from "@/shared/types/model/entities.ts";
import type {
  MessageAnimation,
  MoveStepAnimation,
  ToggleStepAnimation,
} from "@/shared/types/workspace/scene.ts";

const resolveSender = (message: Message, receiverPeerId: UUID): UUID | null => {
  switch (message.type) {
    case MessageType.BatmanOriginatorMessage:
    case MessageType.BatmanEchoLocationMessage:
      return message.senderId !== receiverPeerId ? message.senderId : null;

    case MessageType.DsdvRouteUpdateMessage:
    case MessageType.AodvRouteRequestMessage:
    case MessageType.AodvRouteReplyMessage:
    case MessageType.AodvRouteErrorMessage:
    case MessageType.AodvHelloMessage:
    case MessageType.OlsrHelloMessage:
    case MessageType.OlsrTcMessage:
      return message.senderPeerId !== receiverPeerId ? message.senderPeerId : null;

    case MessageType.DsrRouteRequestMessage: {
      const { path } = message;
      if (!path || path.length === 0) return null;
      const lastIdx = path[path.length - 1] === receiverPeerId ? path.length - 2 : path.length - 1;

      if (lastIdx < 0) return null;
      return path[lastIdx] !== receiverPeerId ? path[lastIdx] : null;
    }

    case MessageType.DsrRouteReplyMessage: {
      const { path } = message;
      if (!path || path.length < 2) return null;

      const idx = path.indexOf(receiverPeerId);
      const senderIdx = idx >= 0 ? idx + 1 : path.length - 1;

      if (senderIdx >= path.length) return null;
      return path[senderIdx] !== receiverPeerId ? path[senderIdx] : null;
    }

    case MessageType.DsrRouteErrorMessage:
      return message.errorSourceId !== receiverPeerId ? message.errorSourceId : null;

    case MessageType.DsrPacket:
    case MessageType.Packet:
      return message.sourcePeerId && message.sourcePeerId !== receiverPeerId
        ? message.sourcePeerId
        : null;

    default:
      return null;
  }
};

const resolveRouteChangeSender = (
  details: RouteChangeEventDetails,
  eventPeerId: UUID,
): UUID | null => {
  switch (details.protocol) {
    case RoutingProtocol.BATMAN:
      if (details.originatorId === eventPeerId) return null;
      if (details.message) return resolveSender(details.message, eventPeerId);
      return details.hopId !== eventPeerId ? details.hopId : null;

    case RoutingProtocol.DSDV:
      if (details.destinationPeerId === eventPeerId) return null;
      if (details.message) return resolveSender(details.message, eventPeerId);
      return details.nextHopPeerId !== eventPeerId ? details.nextHopPeerId : null;

    case RoutingProtocol.AODV:
      if (details.destinationPeerId === eventPeerId) return null;
      if (details.message) return resolveSender(details.message, eventPeerId);
      return details.nextHopPeerId !== eventPeerId ? details.nextHopPeerId : null;

    case RoutingProtocol.OLSR: {
      if (details.message) return resolveSender(details.message, eventPeerId);
      if (details.type === OlsrChangeEventDetailsType.NEIGHBOUR) {
        const nd = details as OlsrNeighbourChangeEventDetails;
        return nd.neighbour.neighbourPeerId !== eventPeerId ? nd.neighbour.neighbourPeerId : null;
      }

      return null;
    }

    case RoutingProtocol.DSR:
      if (details.destinationId === eventPeerId) return null;
      if (details.message) return resolveSender(details.message, eventPeerId);

      return details.path.length >= 2 && details.path[1] !== eventPeerId ? details.path[1] : null;

    default:
      return null;
  }
};

const getEventInspectableMessage = (event: Event): Message | null => {
  if (!("message" in event.details)) {
    return null;
  }

  const message = event.details.message as Message | undefined;
  if (!message || message.type === MessageType.Packet) {
    return null;
  }

  return message;
};

export const buildSimulationMessageAnimations = (
  currentEvent: Event | null,
  currentStepResult: {
    snapshot: { entities: NetworkEntity[] };
    events: Event[];
  } | null,
  fallbackPeers: PeerEntity[],
): MessageAnimation[] => {
  if (!currentEvent || !currentStepResult) {
    return [];
  }

  const peerById = new Map<UUID, PeerEntity>();

  for (const entity of currentStepResult.snapshot.entities) {
    if (entity.type === EntityType.Peer) {
      peerById.set(entity.id, entity as PeerEntity);
    }
  }

  for (const peer of fallbackPeers) {
    if (!peerById.has(peer.id)) {
      peerById.set(peer.id, peer);
    }
  }

  const createAnimation = (
    sourcePeerId: UUID | null,
    targetPeerId: UUID | null,
    suffix: string,
    variant: MessageAnimation["variant"] = "default",
  ): MessageAnimation | null => {
    if (!sourcePeerId || !targetPeerId || sourcePeerId === targetPeerId) {
      return null;
    }

    const sourcePeer = peerById.get(sourcePeerId);
    const targetPeer = peerById.get(targetPeerId);
    if (!sourcePeer || !targetPeer) {
      return null;
    }

    return {
      key: `${currentEvent.id}-${suffix}-${sourcePeerId}-${targetPeerId}`,
      sourceX: sourcePeer.x,
      sourceY: sourcePeer.y,
      targetX: targetPeer.x,
      targetY: targetPeer.y,
      variant,
    };
  };

  if (currentEvent.type === EventType.Broadcast) {
    const details = currentEvent.details as BroadcastEventDetails;
    const message = getEventInspectableMessage(currentEvent);
    if (!message) {
      return [];
    }

    return details.neighbourPeerIds
      .map((peerId, index) =>
        createAnimation(currentEvent.peerId, peerId, `broadcast-${index}`, "default"),
      )
      .filter((animation): animation is MessageAnimation => animation !== null);
  }

  if (currentEvent.type === EventType.Transfer) {
    const details = currentEvent.details as TransferEventDetails;
    const isDsrPacket = details.message?.type === MessageType.DsrPacket;
    const variant = isDsrPacket ? "default" : "transfer";

    return toMessageAnimations([
      createAnimation(details.sourcePeerId, details.targetPeerId, "transfer", variant),
    ]);
  }

  if (currentEvent.type === EventType.Drop) {
    const message = getEventInspectableMessage(currentEvent);
    if (!message) return [];
    const senderPeerId = resolveSender(message, currentEvent.peerId);
    return toMessageAnimations([
      createAnimation(senderPeerId, currentEvent.peerId, "dropped", "dropped"),
    ]);
  }

  if (currentEvent.type === EventType.Calculation) {
    const message = getEventInspectableMessage(currentEvent);
    if (!message) return [];
    const senderPeerId = resolveSender(message, currentEvent.peerId);
    return toMessageAnimations([
      createAnimation(senderPeerId, currentEvent.peerId, "calculation", "route-change"),
    ]);
  }

  if (currentEvent.type === EventType.AddRoute || currentEvent.type === EventType.UpdateRoute) {
    const details = currentEvent.details as RouteChangeEventDetails;
    const message = getEventInspectableMessage(currentEvent);
    if (!message) {
      return [];
    }

    const senderPeerId = resolveRouteChangeSender(details, currentEvent.peerId);
    return toMessageAnimations([
      createAnimation(senderPeerId, currentEvent.peerId, "route-change", "route-change"),
    ]);
  }

  return [];
};

export const buildMoveStepAnimation = (
  currentEvent: Event | null,
): Omit<MoveStepAnimation, "progress"> | null => {
  if (!currentEvent || currentEvent.type !== EventType.Move) {
    return null;
  }

  const details = currentEvent.details as MoveEventDetails;
  return {
    peerId: details.peerId,
    fromX: details.fromX,
    fromY: details.fromY,
    toX: details.toX,
    toY: details.toY,
  };
};

export const buildToggleStepAnimation = (
  currentEvent: Event | null,
): ToggleStepAnimation | null => {
  if (!currentEvent || currentEvent.type !== EventType.StatusChange) {
    return null;
  }

  const details = currentEvent.details as StatusChangeEventDetails;
  if (details.entityType !== "PEER" && details.entityType !== "LINK") {
    return null;
  }

  return {
    entityId: details.entityId,
    entityType: details.entityType,
    nextEnabled: details.nextEnabled,
  };
};

const toMessageAnimations = (animations: Array<MessageAnimation | null>) => {
  return animations.filter((animation): animation is MessageAnimation => animation !== null);
};
