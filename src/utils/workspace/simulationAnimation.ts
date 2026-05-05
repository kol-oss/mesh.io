import type {
  BroadcastEventDetails,
  DroppedEventDetails,
  EntityStatusChangedEventDetails,
  PeerMovedEventDetails,
  RouteSelectedEventDetails,
  SimulationEvent,
  SimulationMessage,
  SimulationPeerSnapshot,
  ThroughputCalculationEventDetails,
} from "../../types/simulation";
import { SimulationEventType, SimulationMessageKind } from "../../types/simulation";
import type {
  MessageAnimation,
  MoveStepAnimation,
  ToggleStepAnimation,
} from "../../types/workspace/scene";
import type { NetworkEntity } from "../../types/entities";

export const buildSimulationMessageAnimations = (
  currentEvent: SimulationEvent | null,
  currentStepResult: {
    snapshot: { peers: SimulationPeerSnapshot[] };
    events: SimulationEvent[];
  } | null,
  fallbackPeers: Array<NetworkEntity & { type: "PEER" }>,
): MessageAnimation[] => {
  if (!currentEvent || !currentStepResult) {
    return [];
  }

  const peerById = new Map<string, SimulationPeerSnapshot | (NetworkEntity & { type: "PEER" })>();

  for (const peer of currentStepResult.snapshot.peers) {
    peerById.set(peer.id, peer);
  }

  for (const peer of fallbackPeers) {
    if (!peerById.has(peer.id)) {
      peerById.set(peer.id, peer);
    }
  }

  const createAnimation = (
    sourcePeerId: string | null,
    targetPeerId: string | null,
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

  if (currentEvent.type === SimulationEventType.SystemMessageBroadcast) {
    const details = currentEvent.details as BroadcastEventDetails;
    return details.neighbourPeerIds
      .map((peerId, index) =>
        createAnimation(currentEvent.peerId, peerId, `broadcast-${index}`, "default"),
      )
      .filter((animation): animation is MessageAnimation => animation !== null);
  }

  if (currentEvent.type === SimulationEventType.SystemRouteSelected) {
    const details = currentEvent.details as RouteSelectedEventDetails;
    return toMessageAnimations([
      createAnimation(
        currentEvent.peerId,
        details.selectedRoute.hopPeerId,
        "route-selected",
        "default",
      ),
    ]);
  }

  if (currentEvent.type === SimulationEventType.SystemMessageDropped) {
    const details = currentEvent.details as DroppedEventDetails;
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

  if (currentEvent.type === SimulationEventType.SystemThroughputCalculated) {
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

    return [];
  }

  if (
    currentEvent.type === SimulationEventType.RoutingTableInsert ||
    currentEvent.type === SimulationEventType.RoutingTableUpdate ||
    currentEvent.type === SimulationEventType.RoutingTableRemove
  ) {
    const details = currentEvent.details as { hopPeerId: string };
    return toMessageAnimations([
      createAnimation(details.hopPeerId, currentEvent.peerId, "route-change", "route-change"),
    ]);
  }

  return [];
};

export const buildMoveStepAnimation = (
  currentEvent: SimulationEvent | null,
): Omit<MoveStepAnimation, "progress"> | null => {
  if (!currentEvent || currentEvent.type !== SimulationEventType.SystemPeerMoved) {
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
  currentEvent: SimulationEvent | null,
): ToggleStepAnimation | null => {
  if (!currentEvent || currentEvent.type !== SimulationEventType.SystemEntityStatusChanged) {
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
  eventPeerId: string,
  message: SimulationMessage,
): { sourcePeerId: string; targetPeerId: string } | null => {
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

  if (message.kind !== SimulationMessageKind.Packet) {
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
