import { OBSTACLE_MIN_WIDTH, OBSTACLE_MIN_HEIGHT } from "@/shared/constants/obstacle";
import type { ObstacleEntity } from "@/shared/types/model/entities";
import type { ObstacleBounds } from "@/shared/types/workspace/interaction";

export const toInt = (value: number) => Math.round(value);

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

export const getObstacleBounds = (obstacle: ObstacleEntity): ObstacleBounds => {
  const halfWidth = Math.max(OBSTACLE_MIN_WIDTH, obstacle.width) / 2;
  const halfHeight = Math.max(OBSTACLE_MIN_HEIGHT, obstacle.height) / 2;

  return {
    left: obstacle.x - halfWidth,
    right: obstacle.x + halfWidth,
    top: obstacle.y - halfHeight,
    bottom: obstacle.y + halfHeight,
  };
};

const rayObstacleIntersectionDistance = (
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  obstacle: ObstacleBounds,
): number | null => {
  let tMin = Number.NEGATIVE_INFINITY;
  let tMax = Number.POSITIVE_INFINITY;

  if (Math.abs(dirX) < Number.EPSILON) {
    if (originX < obstacle.left || originX > obstacle.right) {
      return null;
    }
  } else {
    const tx1 = (obstacle.left - originX) / dirX;
    const tx2 = (obstacle.right - originX) / dirX;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(dirY) < Number.EPSILON) {
    if (originY < obstacle.top || originY > obstacle.bottom) {
      return null;
    }
  } else {
    const ty1 = (obstacle.top - originY) / dirY;
    const ty2 = (obstacle.bottom - originY) / dirY;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  if (tMax < tMin || tMax < 0) {
    return null;
  }

  if (tMin > 0) {
    return tMin;
  }

  return tMax > 0 ? 0 : null;
};

export const getRayDistanceWithObstacleBlocking = (
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  maxDistance: number,
  obstacles: ObstacleBounds[],
) => {
  let minDistance = maxDistance;

  for (const obstacle of obstacles) {
    const hitDistance = rayObstacleIntersectionDistance(originX, originY, dirX, dirY, obstacle);
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

const pointInsideObstacle = (x: number, y: number, obstacle: ObstacleBounds) => {
  return x >= obstacle.left && x <= obstacle.right && y >= obstacle.top && y <= obstacle.bottom;
};

const segmentIntersectsObstacle = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  obstacle: ObstacleBounds,
) => {
  if (pointInsideObstacle(startX, startY, obstacle) || pointInsideObstacle(endX, endY, obstacle)) {
    return true;
  }

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(deltaX) < Number.EPSILON) {
    if (startX < obstacle.left || startX > obstacle.right) {
      return false;
    }
  } else {
    const tx1 = (obstacle.left - startX) / deltaX;
    const tx2 = (obstacle.right - startX) / deltaX;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(deltaY) < Number.EPSILON) {
    if (startY < obstacle.top || startY > obstacle.bottom) {
      return false;
    }
  } else {
    const ty1 = (obstacle.top - startY) / deltaY;
    const ty2 = (obstacle.bottom - startY) / deltaY;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  return tMax >= tMin;
};

export const hasLineOfSight = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  obstacles: ObstacleBounds[],
) => {
  return !obstacles.some((obstacle) =>
    segmentIntersectsObstacle(startX, startY, endX, endY, obstacle),
  );
};
