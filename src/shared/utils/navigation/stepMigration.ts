import type { UUID } from "@/shared/types/common/uuid";
import { generateUUID } from "@/shared/types/common/uuid";
import {
  createStepBase,
  StepType,
  type MessageStep,
  type MoveStep,
  type Step,
  type ToggleStep,
} from "@/shared/types/model/steps";

export const stepTypes = [
  StepType.Move,
  StepType.Message,
  StepType.Toggle,
  StepType.Refresh,
] as const;

const LEGACY_TOGGLE_STEP_TYPE = "TOGGLE";

const normalizeRawStepType = (rawType: unknown): Step["type"] | null => {
  if (rawType === LEGACY_TOGGLE_STEP_TYPE) {
    return StepType.Toggle;
  }

  if (stepTypes.includes(rawType as (typeof stepTypes)[number])) {
    return rawType as Step["type"];
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
    sourceId: hasNonEmptyString(rawStep.sourcePeerId) ? rawStep.sourcePeerId : null,
    destinationId: hasNonEmptyString(rawStep.destinationPeerId) ? rawStep.destinationPeerId : null,
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
    entityId: hasNonEmptyString(rawStep.movePeerId) ? rawStep.movePeerId : null,
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
    entityId: hasNonEmptyString(rawStep.targetEntityId) ? rawStep.targetEntityId : null,
  };
};

export const migrateSteps = (steps: Step[]) => {
  const requiresMigration = steps.some((step) => {
    const rawStep = step as LegacyStep;
    const normalizedType = normalizeRawStepType(rawStep.type);

    return (
      typeof rawStep.tick !== "number" ||
      normalizedType === null ||
      !hasNonEmptyString(rawStep.id) ||
      !hasNonEmptyString(rawStep.title) ||
      (normalizedType === StepType.Message &&
        (!hasOwn(rawStep, "sourceId") || !hasOwn(rawStep, "destinationId"))) ||
      (normalizedType === StepType.Move &&
        (!hasOwn(rawStep, "entityId") ||
          typeof rawStep.x !== "number" ||
          typeof rawStep.y !== "number")) ||
      (normalizedType === StepType.Toggle && !hasOwn(rawStep, "entityId"))
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
