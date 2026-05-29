import type { BoundingBox } from "../types/bound";
import type { Peer } from "../types/network/peer";
import { isIntersectBoundingBoxes } from "./math/bound";

export const isRangedConnected = (source: Peer, destination: Peer, bounds: BoundingBox[]) => {
  if (!source.active || !destination.active) {
    return false;
  }

  if (source.protocol !== destination.protocol) {
    return false;
  }

  const { x: sourceX, y: sourceY } = source.coordinates;
  const { x: destinationX, y: destinationY } = destination.coordinates;

  const distance = Math.hypot(destinationX - sourceX, destinationY - sourceY);
  if (distance > Math.min(source.range, destination.range)) {
    return false;
  }

  return !isIntersectBoundingBoxes(source.coordinates, destination.coordinates, bounds);
};
