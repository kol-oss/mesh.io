import { EWMA_ALPHA } from "@/features/processor/constants/ewma";

export const smooth = (newValue: number, previousValue: number | null) => {
  const result =
    previousValue !== null ? EWMA_ALPHA * newValue + (1 - EWMA_ALPHA) * previousValue : newValue;

  return Math.round(result);
};
