import { EWMA_ALPHA } from "@/shared/constants/ewma";

export const smooth = (newValue: number, previousValue: number | null) => {
  return previousValue !== null
    ? EWMA_ALPHA * newValue + (1 - EWMA_ALPHA) * previousValue
    : newValue;
};
