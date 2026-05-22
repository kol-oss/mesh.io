import { BATMAN_OGM_HOP_PENALTY_PERCENT } from "@/shared/constants/batman";
import type { UUID } from "@/shared/types/common/uuid";
import type { BatmanOriginatorRecord, BatmanRouteRecord } from "../types/batman";

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

export const applyReceptionPenalty = (
  throughput: number,
  tick: number,
  lastTick: number,
  interval: number,
) => {
  const tickGap = Math.max(1, tick - lastTick);
  const expectedGap = Math.max(1, interval);

  const receptionRatio = Math.min(1, expectedGap / tickGap);
  return throughput * receptionRatio;
};

export const toRouteRecord = (
  originator: UUID,
  record: BatmanOriginatorRecord,
): BatmanRouteRecord => {
  return {
    originatorId: originator,
    hopId: record.hopId,
    throughput: record.throughput,
    sequenceWindow: record.sequenceWindow.getBits(),
    lastTick: record.lastTick,
  };
};
