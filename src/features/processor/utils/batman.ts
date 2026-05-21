import { BATMAN_OGM_HOP_PENALTY_PERCENT } from "@/shared/constants/batman";

export const applyDistancePenalty = (
  throughput: number,
  distance: number,
  penaltyDistance: number,
  penaltyPercent: number,
) => {
  if (penaltyPercent <= 0 || distance <= penaltyDistance) {
    return throughput;
  }

  const penalizedUnits = Math.floor(distance / penaltyDistance);
  const penalty = penalizedUnits * penaltyPercent;

  return throughput * ((100 - penalty) / 100);
};

export const applyWirelessPenalty = (throughput: number) => {
  const penalized = throughput * ((100 - BATMAN_OGM_HOP_PENALTY_PERCENT) / 100);
  return Math.max(0, Math.floor(penalized));
};
