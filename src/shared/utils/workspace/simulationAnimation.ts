import type { BatmanCalculationEventDetails } from "@/features/processor/types/protocols/batman";
import type {
  BroadcastEventDetails,
  DropEventDetails,
  Event,
  MoveEventDetails,
  StatusChangeEventDetails,
  TransferEventDetails,
} from "@/shared/types/common/events";
import { EventType } from "@/shared/types/common/events";
import type { Message } from "@/shared/types/common/messages";
import { MessageType } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import type {
  MessageAnimation,
  MoveStepAnimation,
  ToggleStepAnimation,
} from "@/shared/types/workspace/scene";
import type {
  NewDsrRouteReplyMessage,
  NewDsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr.ts";

export const buildSimulationMessageAnimations = (
  currentEvent: Event | null,
  currentStepResult: {
    snapshot: { peers: PeerEntity[] };
    events: Event[];
  } | null,
  fallbackPeers: PeerEntity[],
): MessageAnimation[] => {
  if (!currentEvent || !currentStepResult) {
    return [];
  }

  const peerById = new Map<UUID, PeerEntity>();

  for (const peer of currentStepResult.snapshot.peers) {
    peerById.set(peer.id, peer);
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
    return details.neighbourPeerIds
      .map((peerId, index) =>
        createAnimation(currentEvent.peerId, peerId, `broadcast-${index}`, "default"),
      )
      .filter((animation): animation is MessageAnimation => animation !== null);
  }

  if (currentEvent.type === EventType.Transfer) {
    const details = currentEvent.details as TransferEventDetails;
    return toMessageAnimations([
      createAnimation(details.sourcePeerId, details.targetPeerId, "transfer", "default"),
    ]);
  }

  if (currentEvent.type === EventType.Drop) {
    const details = currentEvent.details as DropEventDetails;
    if (!details.message) {
      return [];
    }

    const droppedAnimation = getDroppedMessageAnimation(currentEvent.peerId, details.message);
    return toMessageAnimations([
      createAnimation(
        droppedAnimation?.sourcePeerId ?? null,
        droppedAnimation?.targetPeerId ?? null,
        "dropped",
        "dropped",
      ),
    ]);
  }

  if (currentEvent.type === EventType.Calculation) {
    if (currentEvent.protocol === RoutingProtocol.BATMAN) {
      const details = currentEvent.details as BatmanCalculationEventDetails;
      if (details.message.type === MessageType.BatmanOriginatorMessage) {
        return toMessageAnimations([
          createAnimation(
            details.message.senderId,
            currentEvent.peerId,
            "throughput",
            "route-change",
          ),
        ]);
      }

      if (details.message.type === MessageType.BatmanEchoLocationMessage) {
        return toMessageAnimations([
          createAnimation(
            details.message.senderId,
            currentEvent.peerId,
            "throughput",
            "route-change",
          ),
        ]);
      }
    }

    return [];
  }

  if (currentEvent.type === EventType.AddRoute || currentEvent.type === EventType.UpdateRoute) {
    const details = currentEvent.details as { hopPeerId?: UUID; nextHopPeerId?: UUID };
    const nextHopPeerId = details.hopPeerId ?? details.nextHopPeerId ?? null;
    if (!nextHopPeerId) {
      return [];
    }

    return toMessageAnimations([
      createAnimation(nextHopPeerId, currentEvent.peerId, "route-change", "route-change"),
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

const getDroppedMessageAnimation = (
  eventPeerId: UUID,
  message: Message,
): { sourcePeerId: UUID; targetPeerId: UUID } | null => {
  if (message.type === MessageType.BatmanEchoLocationMessage) {
    return message.senderId !== eventPeerId
      ? { sourcePeerId: message.senderId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourceId };
  }

  if (message.type === MessageType.BatmanOriginatorMessage) {
    return message.senderId !== eventPeerId
      ? { sourcePeerId: message.senderId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourceId };
  }

  if (message.type === MessageType.DsdvRouteUpdateMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.type === MessageType.OlsrHelloMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.type === MessageType.OlsrTcMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.type === MessageType.DsrRouteRequestMessage) {
    const dsrMessage = message as NewDsrRouteRequestMessage;

    const previousHopPeerId =
      dsrMessage.path && dsrMessage.path.length > 1
        ? dsrMessage.path[dsrMessage.path.length - 2]
        : null;
    if (!previousHopPeerId) {
      return null;
    }

    return { sourcePeerId: previousHopPeerId, targetPeerId: eventPeerId };
  }

  if (message.type === MessageType.DsrRouteReplyMessage) {
    const dsrMessage = message as NewDsrRouteReplyMessage;

    const senderIndex = dsrMessage.path.indexOf(dsrMessage.sourceId);
    const previousPeerId = senderIndex > 0 ? dsrMessage.path[senderIndex - 1] : null;
    if (!previousPeerId) {
      return null;
    }

    return { sourcePeerId: dsrMessage.sourceId, targetPeerId: previousPeerId };
  }

  if (message.type === MessageType.DsrRouteErrorMessage) {
    return {
      sourcePeerId: message.brokenFromPeerId,
      targetPeerId: message.brokenToPeerId,
    };
  }

  if (message.type !== MessageType.Packet) {
    return null;
  }

  // Source-side send failure: packet never left the node, so no link animation.
  if (message.sourcePeerId === null) {
    return null;
  }

  if (message.sourcePeerId && message.sourcePeerId !== eventPeerId) {
    return { sourcePeerId: message.sourcePeerId, targetPeerId: eventPeerId };
  }

  return null;
};

const toMessageAnimations = (animations: Array<MessageAnimation | null>) => {
  return animations.filter((animation): animation is MessageAnimation => animation !== null);
};
