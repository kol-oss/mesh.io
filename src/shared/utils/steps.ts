import { MIN_STEP_TICK } from "../constants/steps";
import {
  StepType,
  type MessageStep,
  type MoveStep,
  type Step,
  type ToggleStep,
  type UserStep,
} from "../types/model/steps";

export const convertStep = (step: Step, type: StepType): Step => {
  if (step.type === type) return step;

  const base = {
    id: step.id,
    type: type,
    title: step.title,
    tick: step.tick,
  };

  if (type === StepType.Message) {
    return {
      ...base,
      type: StepType.Message,
      sourceId: null,
      destinationId: null,
    } satisfies MessageStep;
  }

  if (type === StepType.Toggle) {
    return {
      ...base,
      type: StepType.Toggle,
      entityId: null,
    } satisfies ToggleStep;
  }

  return {
    ...base,
    type: StepType.Move,
    entityId: null,
    x: 0,
    y: 0,
  } satisfies MoveStep;
};

export const updateStep = (step: Step, changes: Partial<UserStep>) => {
  if (step.type === StepType.Message) {
    return {
      ...step,
      ...(changes as Partial<MessageStep>),
    } satisfies MessageStep;
  }

  if (step.type === StepType.Move) {
    return {
      ...step,
      ...(changes as Partial<MoveStep>),
    } satisfies MoveStep;
  }

  if (step.type === StepType.Toggle) {
    return {
      ...step,
      ...(changes as Partial<ToggleStep>),
    } satisfies ToggleStep;
  }

  return step;
};

export const updateTickAndReorder = (step: Step, tick: number, steps: Step[]): Step[] => {
  const normalizedTick = Math.max(MIN_STEP_TICK, tick);
  const stepIndex = steps.findIndex((s) => s.id === step.id);
  if (stepIndex === -1) {
    return steps;
  }

  const updatedStep = {
    ...steps[stepIndex],
    tick: normalizedTick,
  };

  const stepsWithoutCurrent = steps.filter((s) => s.id !== step.id);
  const lastSameTickIndex = (() => {
    let lastIndex = -1;
    for (let i = 0; i < stepsWithoutCurrent.length; i++) {
      if (stepsWithoutCurrent[i].tick === normalizedTick) {
        lastIndex = i;
      }
    }
    return lastIndex;
  })();

  const insertIndex =
    lastSameTickIndex >= 0
      ? lastSameTickIndex + 1
      : (() => {
          const firstGreaterIndex = stepsWithoutCurrent.findIndex(
            (step) => step.tick > normalizedTick,
          );
          return firstGreaterIndex === -1 ? stepsWithoutCurrent.length : firstGreaterIndex;
        })();

  const reorderedSteps = [...stepsWithoutCurrent];
  reorderedSteps.splice(insertIndex, 0, updatedStep);

  return reorderedSteps;
};
