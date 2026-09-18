import { OBSTACLE_MIN_HEIGHT, OBSTACLE_MIN_WIDTH } from "@/shared/constants/entities/obstacle";
import type { UUID } from "@/shared/types/common/uuid";
import type { ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { BoundingBox } from "../../types/bound";
import { getBoundingBox, getRayBoundingBoxIntersection, isIntersectBoundingBox } from "./bound";

export const toInt = (value: number) => Math.round(value);

export const getDistance = (
  source: { x: number; y: number },
  destination: { x: number; y: number },
) => {
  return Math.round(Math.hypot(destination.x - source.x, destination.y - source.y) * 10) / 10;
};

export const shortenLine = (x1: number, y1: number, x2: number, y2: number, amount: number) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length <= amount * 2) {
    return { x1, y1, x2, y2 };
  }

  const unitX = (x2 - x1) / length;
  const unitY = (y2 - y1) / length;

  return {
    x1: x1 + unitX * amount,
    y1: y1 + unitY * amount,
    x2: x2 - unitX * amount,
    y2: y2 - unitY * amount,
  };
};

export const getObstacleBoundingBox = (obstacle: ObstacleEntity): BoundingBox => {
  const width = Math.max(OBSTACLE_MIN_WIDTH, obstacle.width);
  const height = Math.max(OBSTACLE_MIN_HEIGHT, obstacle.height);
  return getBoundingBox(obstacle, width, height);
};

export const hasLineOfSight = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  bounds: BoundingBox[],
) => {
  return !bounds.some((bound) =>
    isIntersectBoundingBox({ x: startX, y: startY }, { x: endX, y: endY }, bound),
  );
};

export const getRayDistanceWithObstacleBlocking = (
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  maxDistance: number,
  bounds: BoundingBox[],
) => {
  let minDistance = maxDistance;

  for (const bound of bounds) {
    const hitDistance = getRayBoundingBoxIntersection(
      { x: originX, y: originY },
      { x: dirX, y: dirY },
      bound,
    );
    if (hitDistance === null) {
      continue;
    }

    minDistance = Math.min(minDistance, hitDistance);
    if (minDistance <= 0) {
      break;
    }
  }

  return Math.max(0, minDistance);
};

export const getConnectivityObstacleBounds = (obstacles: ObstacleEntity[]): BoundingBox[] => {
  return obstacles.map(getObstacleBoundingBox);
};

export const canCreateRangedConnection = (
  sourcePeer: PeerEntity,
  destinationPeer: PeerEntity,
  bounds: BoundingBox[],
) => {
  if (!sourcePeer.enabled || !destinationPeer.enabled) {
    return false;
  }

  if (sourcePeer.protocol !== destinationPeer.protocol) {
    return false;
  }

  const distance = Math.hypot(destinationPeer.x - sourcePeer.x, destinationPeer.y - sourcePeer.y);
  const inRange = distance <= Math.min(sourcePeer.range, destinationPeer.range);
  if (!inRange) {
    return false;
  }

  return hasLineOfSight(sourcePeer.x, sourcePeer.y, destinationPeer.x, destinationPeer.y, bounds);
};

export const getRangedConnectionPairs = (
  peers: PeerEntity[],
  bounds: BoundingBox[],
): Array<{
  sourceId: UUID;
  targetId: UUID;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}> => {
  const pairs: Array<{
    sourceId: UUID;
    targetId: UUID;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
  }> = [];

  for (let index = 0; index < peers.length; index += 1) {
    const sourcePeer = peers[index];

    for (let innerIndex = index + 1; innerIndex < peers.length; innerIndex += 1) {
      const destinationPeer = peers[innerIndex];

      if (!canCreateRangedConnection(sourcePeer, destinationPeer, bounds)) {
        continue;
      }

      pairs.push({
        sourceId: sourcePeer.id,
        targetId: destinationPeer.id,
        sourceX: sourcePeer.x,
        sourceY: sourcePeer.y,
        targetX: destinationPeer.x,
        targetY: destinationPeer.y,
      });
    }
  }

  return pairs;
};
