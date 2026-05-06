import { StepType } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  createStepBase,
  type MessageStep,
  type MoveStep,
  type ToggleStatusStep,
  type WorkflowStep,
} from "../../types/steps";
import { generateUUID } from "../../types/uuid";
import type { UUID } from "../../types/uuid";

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

type LegacyStep = Partial<{
  id: UUID;
  title: string;
  tick: number;
  type: string;
  sourcePeerId: UUID | null;
  destinationPeerId: UUID | null;
  targetEntityId: UUID | null;
  movePeerId: UUID | null;
  x: number;
  y: number;
}>;

const hasNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const normalizeMessageStep = (rawStep: LegacyStep, index: number): MessageStep => {
  return {
    ...createStepBase({
      id: hasNonEmptyString(rawStep.id) ? rawStep.id : generateUUID(),
      title: hasNonEmptyString(rawStep.title) ? rawStep.title : ui.steps.typeMessage,
      tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
    }),
    type: StepType.Message,
    sourcePeerId: hasNonEmptyString(rawStep.sourcePeerId) ? rawStep.sourcePeerId : null,
    destinationPeerId: hasNonEmptyString(rawStep.destinationPeerId)
      ? rawStep.destinationPeerId
      : null,
  };
};

const normalizeMoveStep = (rawStep: LegacyStep, index: number): MoveStep => {
  return {
    ...createStepBase({
      id: hasNonEmptyString(rawStep.id) ? rawStep.id : generateUUID(),
      title: hasNonEmptyString(rawStep.title) ? rawStep.title : ui.steps.typeMove,
      tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
    }),
    type: StepType.Move,
    movePeerId: hasNonEmptyString(rawStep.movePeerId) ? rawStep.movePeerId : null,
    x: typeof rawStep.x === "number" ? rawStep.x : 0,
    y: typeof rawStep.y === "number" ? rawStep.y : 0,
  };
};

const normalizeToggleStep = (rawStep: LegacyStep, index: number): ToggleStatusStep => {
  return {
    ...createStepBase({
      id: hasNonEmptyString(rawStep.id) ? rawStep.id : generateUUID(),
      title: hasNonEmptyString(rawStep.title) ? rawStep.title : ui.steps.typeToggle,
      tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
    }),
    type: StepType.ToggleStatus,
    targetEntityId: hasNonEmptyString(rawStep.targetEntityId) ? rawStep.targetEntityId : null,
  };
};

export const migrateSteps = (steps: WorkflowStep[]) => {
  const requiresMigration = steps.some((step) => {
    const rawStep = step as LegacyStep;
    const normalizedType = normalizeRawStepType(rawStep.type);

    return (
      typeof rawStep.tick !== "number" ||
      normalizedType === null ||
      !hasNonEmptyString(rawStep.id) ||
      !hasNonEmptyString(rawStep.title) ||
      (normalizedType === StepType.Message &&
        (rawStep.sourcePeerId == null || rawStep.destinationPeerId == null)) ||
      (normalizedType === StepType.Move &&
        (rawStep.movePeerId == null ||
          typeof rawStep.x !== "number" ||
          typeof rawStep.y !== "number")) ||
      (normalizedType === StepType.ToggleStatus && rawStep.targetEntityId == null)
    );
  });

  if (!requiresMigration) {
    return null;
  }

  return steps.map((step, index) => {
    const rawStep = step as LegacyStep;
    const normalizedType = normalizeRawStepType(rawStep.type) ?? StepType.Move;

    if (normalizedType === StepType.Refresh) {
      return step;
    }

    if (normalizedType === StepType.Message) {
      return normalizeMessageStep(rawStep, index);
    }

    if (normalizedType === StepType.ToggleStatus) {
      return normalizeToggleStep(rawStep, index);
    }

    return normalizeMoveStep(rawStep, index);
  });
};
