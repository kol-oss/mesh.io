import { StepType } from "../../types/model/steps";
import {
  createStepBase,
  type MessageStep,
  type MoveStep,
  type ToggleStep,
  type WorkflowStep,
} from "../../types/model/steps";
import { generateUUID } from "../../types/common/uuid";
import type { UUID } from "../../types/common/uuid";

export const stepTypes = [
  StepType.Move,
  StepType.Message,
  StepType.Toggle,
  StepType.Refresh,
] as const;

const LEGACY_TOGGLE_STEP_TYPE = "TOGGLE";

const normalizeRawStepType = (rawType: unknown): WorkflowStep["type"] | null => {
  if (rawType === LEGACY_TOGGLE_STEP_TYPE) {
    return StepType.Toggle;
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

const hasOwn = <T extends object>(value: T, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeMessageStep = (rawStep: LegacyStep, index: number): MessageStep => {
  return {
    ...createStepBase({
      id: hasNonEmptyString(rawStep.id) ? rawStep.id : generateUUID(),
      title: hasNonEmptyString(rawStep.title) ? rawStep.title : "Message",
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
      title: hasNonEmptyString(rawStep.title) ? rawStep.title : "Move",
      tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
    }),
    type: StepType.Move,
    movePeerId: hasNonEmptyString(rawStep.movePeerId) ? rawStep.movePeerId : null,
    x: typeof rawStep.x === "number" ? rawStep.x : 0,
    y: typeof rawStep.y === "number" ? rawStep.y : 0,
  };
};

const normalizeToggleStep = (rawStep: LegacyStep, index: number): ToggleStep => {
  return {
    ...createStepBase({
      id: hasNonEmptyString(rawStep.id) ? rawStep.id : generateUUID(),
      title: hasNonEmptyString(rawStep.title) ? rawStep.title : "Toggle",
      tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
    }),
    type: StepType.Toggle,
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
        (!hasOwn(rawStep, "sourcePeerId") || !hasOwn(rawStep, "destinationPeerId"))) ||
      (normalizedType === StepType.Move &&
        (!hasOwn(rawStep, "movePeerId") ||
          typeof rawStep.x !== "number" ||
          typeof rawStep.y !== "number")) ||
      (normalizedType === StepType.Toggle && !hasOwn(rawStep, "targetEntityId"))
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

    if (normalizedType === StepType.Toggle) {
      return normalizeToggleStep(rawStep, index);
    }

    return normalizeMoveStep(rawStep, index);
  });
};
