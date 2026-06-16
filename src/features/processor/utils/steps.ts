import type { Step } from "@/shared/types/model/steps";

// groups steps into ordered lists by tick
export const groupStepsByTick = (steps: Step[]): Step[][] => {
  const grouped = Object.groupBy(steps, (step) => step.tick);
  return Object.values(grouped) as Step[][];
};
