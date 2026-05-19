import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import type {
  BroadcastEventDetails,
  DroppedEventDetails,
  EntityStatusChangedEventDetails,
  Event,
  PeerMovedEventDetails,
  RouteSelectedEventDetails,
  SimulationMessage,
  SimulationPeerSnapshot,
  ThroughputCalculationEventDetails,
} from "@/shared/types/model/simulation";
import { EventType, SimulationMessageKind } from "@/shared/types/model/simulation";
import type {
  MessageAnimation,
  MoveStepAnimation,
  ToggleStepAnimation,
} from "@/shared/types/workspace/scene";

export const buildSimulationMessageAnimations = (
  currentEvent: Event | null,
  currentStepResult: {
    snapshot: { peers: SimulationPeerSnapshot[] };
    events: Event[];
  } | null,
  fallbackPeers: PeerEntity[],
): MessageAnimation[] => {
  if (!currentEvent || !currentStepResult) {
    return [];
  }

  const peerById = new Map<UUID, SimulationPeerSnapshot | PeerEntity>();

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

  if (currentEvent.type === EventType.SystemMessageBroadcast) {
    const details = currentEvent.details as BroadcastEventDetails;
    return details.neighbourPeerIds
      .map((peerId, index) =>
        createAnimation(currentEvent.peerId, peerId, `broadcast-${index}`, "default"),
      )
      .filter((animation): animation is MessageAnimation => animation !== null);
  }

  if (currentEvent.type === EventType.SystemRouteSelected) {
    const details = currentEvent.details as RouteSelectedEventDetails;
    const hopPeerId =
      "hopPeerId" in details.selectedRoute
        ? details.selectedRoute.hopPeerId
        : details.selectedRoute.nextHopPeerId;

    return toMessageAnimations([
      createAnimation(currentEvent.peerId, hopPeerId, "route-selected", "default"),
    ]);
  }

  if (currentEvent.type === EventType.SystemMessageDropped) {
    const details = currentEvent.details as DroppedEventDetails;
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

  if (currentEvent.type === EventType.SystemThroughputCalculated) {
    const details = currentEvent.details as ThroughputCalculationEventDetails;
    if (details.message.kind === SimulationMessageKind.BatmanOriginatorMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.DsdvRouteUpdateMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.AodvRouteReplyMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          details.message.targetPeerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.AodvRouteErrorMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          details.message.targetPeerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.OlsrHelloMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.OlsrTcMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.senderPeerId,
          currentEvent.peerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.DsrRouteRequestMessage) {
      const previousHopPeerId =
        details.message.routePeerIds.length > 1
          ? details.message.routePeerIds[details.message.routePeerIds.length - 2]
          : null;
      return toMessageAnimations([
        createAnimation(previousHopPeerId, currentEvent.peerId, "throughput", "route-change"),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.DsrRouteReplyMessage) {
      const senderPeerId = details.message.senderPeerId;
      const senderIndex = details.message.routePeerIds.indexOf(senderPeerId);
      const targetPeerId = senderIndex > 0 ? details.message.routePeerIds[senderIndex - 1] : null;
      return toMessageAnimations([
        createAnimation(senderPeerId, targetPeerId, "throughput", "route-change"),
      ]);
    }

    if (details.message.kind === SimulationMessageKind.DsrRouteErrorMessage) {
      return toMessageAnimations([
        createAnimation(
          details.message.brokenFromPeerId,
          details.message.brokenToPeerId,
          "throughput",
          "route-change",
        ),
      ]);
    }

    return [];
  }

  if (
    currentEvent.type === EventType.RoutingTableInsert ||
    currentEvent.type === EventType.RoutingTableUpdate
  ) {
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
  if (!currentEvent || currentEvent.type !== EventType.SystemPeerMoved) {
    return null;
  }

  const details = currentEvent.details as PeerMovedEventDetails;
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
  if (!currentEvent || currentEvent.type !== EventType.SystemEntityStatusChanged) {
    return null;
  }

  const details = currentEvent.details as EntityStatusChangedEventDetails;
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
  message: SimulationMessage,
): { sourcePeerId: UUID; targetPeerId: UUID } | null => {
  if (message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind === SimulationMessageKind.DsdvRouteUpdateMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind === SimulationMessageKind.OlsrHelloMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind === SimulationMessageKind.OlsrTcMessage) {
    return message.senderPeerId !== eventPeerId
      ? { sourcePeerId: message.senderPeerId, targetPeerId: eventPeerId }
      : { sourcePeerId: eventPeerId, targetPeerId: message.sourcePeerId };
  }

  if (message.kind === SimulationMessageKind.DsrRouteRequestMessage) {
    const previousHopPeerId =
      message.routePeerIds.length > 1
        ? message.routePeerIds[message.routePeerIds.length - 2]
        : null;
    if (!previousHopPeerId) {
      return null;
    }

    return { sourcePeerId: previousHopPeerId, targetPeerId: eventPeerId };
  }

  if (message.kind === SimulationMessageKind.DsrRouteReplyMessage) {
    const senderIndex = message.routePeerIds.indexOf(message.senderPeerId);
    const previousPeerId = senderIndex > 0 ? message.routePeerIds[senderIndex - 1] : null;
    if (!previousPeerId) {
      return null;
    }

    return { sourcePeerId: message.senderPeerId, targetPeerId: previousPeerId };
  }

  if (message.kind === SimulationMessageKind.DsrRouteErrorMessage) {
    return {
      sourcePeerId: message.brokenFromPeerId,
      targetPeerId: message.brokenToPeerId,
    };
  }

  if (message.kind !== SimulationMessageKind.Packet) {
    return null;
  }

  // Source-side send failure: packet never left the node, so no link animation.
  if (message.sourcePeerId === null) {
    return null;
  }

  if (message.sourcePeerId && message.sourcePeerId !== eventPeerId) {
    return { sourcePeerId: message.sourcePeerId, targetPeerId: eventPeerId };
  }

  return message.destinationPeerId !== eventPeerId
    ? { sourcePeerId: eventPeerId, targetPeerId: message.destinationPeerId }
    : null;
};

const toMessageAnimations = (animations: Array<MessageAnimation | null>) => {
  return animations.filter((animation): animation is MessageAnimation => animation !== null);
};
