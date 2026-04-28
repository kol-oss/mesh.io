import { useMemo } from "react";

import { workspaceRangeSamples } from "../../constants/workspace";
import type { MoveIndicator } from "../../types/workspaceScene";
import type { RangePolygon } from "../../types/interaction";
import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import {
  getObstacleBounds,
  getRayDistanceWithObstacleBlocking,
  hasLineOfSight,
} from "../../utils/geometry";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";

type UseWorkspaceDerivedParams = {
  entities: NetworkEntity[];
  steps: WorkflowStep[];
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  creationSelectedEntityId: string | null;
  placementMode: ToolbarPlacementMode;
  moveTargetPreview: { x: number; y: number } | null;
  workspaceSize: { width: number; height: number };
};

export function useWorkspaceDerived({
  entities,
  steps,
  selectedId,
  selectedSource,
  creationSelectedEntityId,
  placementMode,
  moveTargetPreview,
  workspaceSize,
}: UseWorkspaceDerivedParams) {
  const peers = useMemo(
    () => entities.filter((entity): entity is PeerEntity => entity.type === "PEER"),
    [entities],
  );
  const links = useMemo(
    () => entities.filter((entity): entity is LinkEntity => entity.type === "LINK"),
    [entities],
  );
  const obstacles = useMemo(
    () => entities.filter((entity): entity is ObstacleEntity => entity.type === "OBSTACLE"),
    [entities],
  );
  const peerById = useMemo(() => new Map(peers.map((peer) => [peer.id, peer])), [peers]);

  const staticLinks = useMemo(() => {
    return links
      .map((link) => {
        if (!link.sourcePeerId || !link.destinationPeerId) {
          return null;
        }

        const sourcePeer = peerById.get(link.sourcePeerId);
        const destinationPeer = peerById.get(link.destinationPeerId);
        if (!sourcePeer || !destinationPeer || sourcePeer.id === destinationPeer.id) {
          return null;
        }

        return {
          id: link.id,
          enabled: link.enabled,
          sourceX: sourcePeer.x,
          sourceY: sourcePeer.y,
          destinationX: destinationPeer.x,
          destinationY: destinationPeer.y,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [links, peerById]);

  const centerX = workspaceSize.width / 2;
  const centerY = workspaceSize.height / 2;

  const resolvedCreationSelectedEntityId = useMemo(() => {
    if (!creationSelectedEntityId) {
      return null;
    }

    return entities.some((entity) => entity.id === creationSelectedEntityId)
      ? creationSelectedEntityId
      : null;
  }, [creationSelectedEntityId, entities]);

  const obstacleBounds = useMemo(() => obstacles.map(getObstacleBounds), [obstacles]);

  const connections = useMemo(() => {
    const enabledPeers = peers.filter((peer) => peer.enabled);
    const result = [];

    for (let i = 0; i < enabledPeers.length; i += 1) {
      for (let j = i + 1; j < enabledPeers.length; j += 1) {
        const peerA = enabledPeers[i];
        const peerB = enabledPeers[j];
        const deltaX = peerB.x - peerA.x;
        const deltaY = peerB.y - peerA.y;
        const distance = Math.hypot(deltaX, deltaY);
        const clearLineOfSight = hasLineOfSight(peerA.x, peerA.y, peerB.x, peerB.y, obstacleBounds);

        const aToB = distance <= peerA.range && clearLineOfSight;
        const bToA = distance <= peerB.range && clearLineOfSight;

        if (aToB && bToA) {
          result.push({
            type: "MUTUAL" as const,
            sourceId: peerA.id,
            targetId: peerB.id,
            sourceX: peerA.x,
            sourceY: peerA.y,
            targetX: peerB.x,
            targetY: peerB.y,
          });
          continue;
        }

        if (aToB) {
          result.push({
            type: "ONE_WAY" as const,
            sourceId: peerA.id,
            targetId: peerB.id,
            sourceX: peerA.x,
            sourceY: peerA.y,
            targetX: peerB.x,
            targetY: peerB.y,
          });
        }

        if (bToA) {
          result.push({
            type: "ONE_WAY" as const,
            sourceId: peerB.id,
            targetId: peerA.id,
            sourceX: peerB.x,
            sourceY: peerB.y,
            targetX: peerA.x,
            targetY: peerA.y,
          });
        }
      }
    }

    return result;
  }, [obstacleBounds, peers]);

  const rangePolygons = useMemo(() => {
    if (workspaceSize.width <= 0 || workspaceSize.height <= 0) {
      return [];
    }

    return peers
      .filter((peer) => peer.range > 0)
      .map<RangePolygon>((peer) => {
        const points: string[] = [];
        const baseX = centerX + peer.x;
        const baseY = centerY + peer.y;

        for (let index = 0; index <= workspaceRangeSamples; index += 1) {
          const angle = (index / workspaceRangeSamples) * Math.PI * 2;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
          const distance = getRayDistanceWithObstacleBlocking(
            peer.x,
            peer.y,
            dirX,
            dirY,
            peer.range,
            obstacleBounds,
          );
          const pointX = baseX + dirX * distance;
          const pointY = baseY + dirY * distance;
          points.push(`${pointX.toFixed(2)},${pointY.toFixed(2)}`);
        }

        const path = points.length > 0 ? `M ${points[0]} L ${points.slice(1).join(" L ")} Z` : "";

        return {
          peerId: peer.id,
          enabled: peer.enabled,
          selected: selectedSource === "entities" && selectedId === peer.id,
          path,
        };
      });
  }, [centerX, centerY, obstacleBounds, peers, selectedId, selectedSource, workspaceSize]);

  const selectedMoveStep = useMemo(() => {
    if (selectedSource !== "steps" || !selectedId) {
      return null;
    }

    const step = steps.find((candidate) => candidate.id === selectedId);
    if (!step || step.type !== "MOVE" || !step.movePeerId || isRefreshStep(step)) {
      return null;
    }

    const sourcePeer = peerById.get(step.movePeerId);
    if (!sourcePeer) {
      return null;
    }

    return {
      sourceX: sourcePeer.x,
      sourceY: sourcePeer.y,
      targetX: step.x,
      targetY: step.y,
      draft: false,
    };
  }, [peerById, selectedId, selectedSource, steps]);

  const draftMoveStep = useMemo(() => {
    if (placementMode !== "move" || !resolvedCreationSelectedEntityId || !moveTargetPreview) {
      return null;
    }

    const sourcePeer = peerById.get(resolvedCreationSelectedEntityId);
    if (!sourcePeer) {
      return null;
    }

    return {
      sourceX: sourcePeer.x,
      sourceY: sourcePeer.y,
      targetX: moveTargetPreview.x,
      targetY: moveTargetPreview.y,
      draft: true,
    };
  }, [moveTargetPreview, peerById, placementMode, resolvedCreationSelectedEntityId]);

  const moveIndicators = [selectedMoveStep, draftMoveStep].filter(
    (indicator): indicator is MoveIndicator => indicator !== null,
  );

  const selectedStepAffectedEntityIds = useMemo(() => {
    if (selectedSource !== "steps" || !selectedId) {
      return new Set<string>();
    }

    const step = steps.find((candidate) => candidate.id === selectedId);
    if (!step) {
      return new Set<string>();
    }

    const ids = new Set<string>();

    if (step.type === "MESSAGE") {
      if (step.sourcePeerId) ids.add(step.sourcePeerId);
      if (step.destinationPeerId) ids.add(step.destinationPeerId);
    }

    if (step.type === "MOVE") {
      if (step.movePeerId) ids.add(step.movePeerId);
    }

    if (step.type === "TOGGLE") {
      if (step.targetEntityId) ids.add(step.targetEntityId);
    }

    if (step.type === "REFRESH") {
      if (step.refreshPeerId) ids.add(step.refreshPeerId);
    }

    return ids;
  }, [selectedId, selectedSource, steps]);

  return {
    peers,
    links,
    obstacles,
    peerById,
    staticLinks,
    centerX,
    centerY,
    resolvedCreationSelectedEntityId,
    obstacleBounds,
    connections,
    rangePolygons,
    moveIndicators,
    selectedStepAffectedEntityIds,
  };
}
