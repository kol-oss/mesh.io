import { StepType } from "../../types/enums";
import type { WorkflowStep } from "../../types/steps";

export const stepTypes = [
  StepType.Move,
  StepType.Message,
  StepType.ToggleStatus,
  StepType.Refresh,
] as const;

const LEGACY_TOGGLE_STEP_TYPE = "TOGGLE";

const normalizeRawStepType = (rawType: unknown): WorkflowStep["type"] | null => {
  if (rawType === LEGACY_TOGGLE_STEP_TYPE) {
    return StepType.ToggleStatus;
  }

  if (stepTypes.includes(rawType as (typeof stepTypes)[number])) {
    return rawType as WorkflowStep["type"];
  }

  return null;
};

export const migrateSteps = (steps: WorkflowStep[]) => {
  const requiresMigration = steps.some((step) => {
    const rawStep = step as WorkflowStep & {
      tick?: number;
      type?: string;
      sourcePeerId?: string | null;
      destinationPeerId?: string | null;
      targetEntityId?: string | null;
      movePeerId?: string | null;
      x?: number;
      y?: number;
    };

    return (
      typeof rawStep.tick !== "number" ||
      normalizeRawStepType(rawStep.type) === null ||
      (rawStep.sourcePeerId !== null && typeof rawStep.sourcePeerId !== "string") ||
      (rawStep.destinationPeerId !== null && typeof rawStep.destinationPeerId !== "string") ||
      (rawStep.targetEntityId !== null && typeof rawStep.targetEntityId !== "string") ||
      (rawStep.movePeerId !== null && typeof rawStep.movePeerId !== "string") ||
      typeof rawStep.x !== "number" ||
      typeof rawStep.y !== "number"
    );
  });

  if (!requiresMigration) {
    return null;
  }

  return steps.map((step, index) => {
    const rawStep = step as WorkflowStep & {
      tick?: number;
      type?: string;
      sourcePeerId?: string | null;
      destinationPeerId?: string | null;
      targetEntityId?: string | null;
      movePeerId?: string | null;
      x?: number;
      y?: number;
    };

    return {
      ...step,
      type: normalizeRawStepType(rawStep.type) ?? StepType.Move,
      tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
      sourcePeerId: typeof rawStep.sourcePeerId === "string" ? rawStep.sourcePeerId : null,
      destinationPeerId:
        typeof rawStep.destinationPeerId === "string" ? rawStep.destinationPeerId : null,
      targetEntityId: typeof rawStep.targetEntityId === "string" ? rawStep.targetEntityId : null,
      movePeerId: typeof rawStep.movePeerId === "string" ? rawStep.movePeerId : null,
      x: typeof rawStep.x === "number" ? rawStep.x : 0,
      y: typeof rawStep.y === "number" ? rawStep.y : 0,
    };
  });
};
