import {
  BATMAN_MAX_THROUGHPUT,
  BATMAN_OGM_HOP_PENALTY_PERCENT,
} from "@/shared/constants/batman.ts";

export const clampThroughput = (throughput: number) => {
  if (!Number.isFinite(throughput)) {
    return BATMAN_MAX_THROUGHPUT;
  }

  return Math.max(0, Math.min(BATMAN_MAX_THROUGHPUT, Math.floor(throughput)));
};

export const getDistanceBetweenPeers = (
  sourcePeer: { x: number; y: number },
  destinationPeer: { x: number; y: number },
) => {
  return Math.hypot(destinationPeer.x - sourcePeer.x, destinationPeer.y - sourcePeer.y);
};

export const applyDistancePenalty = (
  throughput: number,
  distance: number,
  distancePenaltyDistance: number,
  distancePenaltyPercent: number,
) => {
  if (!Number.isFinite(distancePenaltyPercent) || distancePenaltyPercent <= 0) {
    return throughput;
  }

  if (distance <= distancePenaltyDistance) {
    return throughput;
  }

  const penalizedUnits = Math.floor(distance / distancePenaltyDistance);
  const penalty = penalizedUnits * distancePenaltyPercent;

  return throughput * ((100 - penalty) / 100);
};

export const applyFixedHopPenalty = (throughput: number) => {
  const penalized = throughput * ((100 - BATMAN_OGM_HOP_PENALTY_PERCENT) / 100);
  return Math.max(0, Math.floor(penalized));
};
