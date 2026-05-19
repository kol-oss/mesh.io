import type { Step } from "../types/model/steps";

// sorts steps by tick and input order
export const sortStepsByTick = (steps: Step[]) => {
  return [...steps]
    .map((step, index) => ({ step, index }))
    .sort((left, right) => {
      if (left.step.tick !== right.step.tick) {
        return left.step.tick - right.step.tick;
      }

      return left.index - right.index;
    })
    .map(({ step }) => step);
};
