import type { Coordinate } from "@/shared/types/model/base";
import type { BoundingBox } from "../../types/bound";

// retrieve axis-aligned bounding box
export const getBoundingBox = (
  coordinates: Coordinate,
  width: number,
  height: number,
): BoundingBox => {
  const halfWidth = Math.max(0, width) / 2;
  const halfHeight = Math.max(0, height) / 2;

  const { x, y } = coordinates;
  return {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - halfHeight,
    bottom: y + halfHeight,
  };
};

// check if the point is inside the bounding box
export const isInsideBoundingBox = (coordinates: Coordinate, bound: BoundingBox): boolean => {
  const { x, y } = coordinates;
  return x >= bound.left && x <= bound.right && y >= bound.top && y <= bound.bottom;
};

// Liang-Barsky line clipping algorithm
export const isIntersectBoundingBox = (start: Coordinate, end: Coordinate, bound: BoundingBox) => {
  // if start or end of line is inside the bounding box, the line intersects the box
  if (isInsideBoundingBox(start, bound) || isInsideBoundingBox(end, bound)) {
    return true;
  }

  const { x: startX, y: startY } = start;
  const { x: endX, y: endY } = end;

  // calculate the deltas
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  let tMin = 0;
  let tMax = 1;

  // intersection by vertical coordinates (x-axis)
  if (Math.abs(deltaX) < Number.EPSILON) {
    // case when line is vertical, check if it is within the horizontal bounds of the box
    if (startX < bound.left || startX > bound.right) {
      return false;
    }
  } else {
    // narrowing of the coordinate range based on the intersection
    const tx1 = (bound.left - startX) / deltaX;
    const tx2 = (bound.right - startX) / deltaX;

    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  // intersection by horizontal coordinates (y-axis)
  if (Math.abs(deltaY) < Number.EPSILON) {
    // case when line is horizontal, check if it is within the vertical bounds of the box
    if (startY < bound.top || startY > bound.bottom) {
      return false;
    }
  } else {
    // narrowing of the coordinate range based on the intersection
    const ty1 = (bound.top - startY) / deltaY;
    const ty2 = (bound.bottom - startY) / deltaY;

    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  // checking if the line has a valid intersection with the bounding box
  return tMax >= tMin;
};

// check if the line intersects with any of the bounding boxes
export const isIntersectBoundingBoxes = (
  start: Coordinate,
  end: Coordinate,
  bounds: BoundingBox[],
): boolean => {
  return bounds.some((bound) => isIntersectBoundingBox(start, end, bound));
};

// compute the parametric distance along a ray to the nearest intersection with a bounding box
export const getRayBoundingBoxIntersection = (
  origin: Coordinate,
  direction: Coordinate,
  bound: BoundingBox,
): number | null => {
  const { x: originX, y: originY } = origin;
  const { x: dirX, y: dirY } = direction;

  let tMin = Number.NEGATIVE_INFINITY;
  let tMax = Number.POSITIVE_INFINITY;

  // intersection by vertical coordinates (x-axis)
  if (Math.abs(dirX) < Number.EPSILON) {
    // case when ray is vertical, check if origin is within horizontal bounds
    if (originX < bound.left || originX > bound.right) {
      return null;
    }
  } else {
    // narrowing of the coordinate range based on the intersection
    const tx1 = (bound.left - originX) / dirX;
    const tx2 = (bound.right - originX) / dirX;

    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  // intersection by horizontal coordinates (y-axis)
  if (Math.abs(dirY) < Number.EPSILON) {
    // case when ray is horizontal, check if origin is within vertical bounds
    if (originY < bound.top || originY > bound.bottom) {
      return null;
    }
  } else {
    // narrowing of the coordinate range based on the intersection
    const ty1 = (bound.top - originY) / dirY;
    const ty2 = (bound.bottom - originY) / dirY;

    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  // checking if the ray has a valid forward intersection with the bounding box
  if (tMax < tMin || tMax < 0) {
    return null;
  }

  if (tMin > 0) {
    return tMin;
  }

  return tMax > 0 ? 0 : null;
};
