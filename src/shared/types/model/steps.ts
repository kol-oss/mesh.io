import type { BaseStepSchema } from "@/shared/schemas/step/BaseStepSchema";
import type { MessageStepSchema } from "@/shared/schemas/step/MessageStepSchema";
import type { MoveStepSchema } from "@/shared/schemas/step/MoveStepSchema";
import type { RefreshStepSchema } from "@/shared/schemas/step/RefreshStepSchema";
import type { ToggleStepSchema } from "@/shared/schemas/step/ToggleStepSchema";
import { z } from "zod";

export enum StepType {
  Move = "MOVE",
  Message = "MESSAGE",
  Toggle = "TOGGLE_STATUS",
  Refresh = "REFRESH",
}

export enum RefreshAction {
  BatmanElp = "BATMAN_ELP",
  BatmanOgm = "BATMAN_OGM",
  DsdvFullDump = "DSDV_FULL_DUMP",
  DsdvIncremental = "DSDV_INCREMENTAL",
  AodvHello = "AODV_HELLO",
  OlsrHello = "OLSR_HELLO",
  OlsrTc = "OLSR_TC",
}

export type BaseStep = z.infer<typeof BaseStepSchema>;
export type MessageStep = z.infer<typeof MessageStepSchema>;
export type MoveStep = z.infer<typeof MoveStepSchema>;
export type ToggleStep = z.infer<typeof ToggleStepSchema>;
export type RefreshStep = z.infer<typeof RefreshStepSchema>;
export type UserStep = MessageStep | MoveStep | ToggleStep;
export type Step = UserStep | RefreshStep;

export const isMessageStep = (step: Step): step is MessageStep => {
  return step.type === StepType.Message;
};

export const isMoveStep = (step: Step): step is MoveStep => {
  return step.type === StepType.Move;
};

export const isToggleStep = (step: Step): step is ToggleStep => {
  return step.type === StepType.Toggle;
};

export const isRefreshStepType = (step: Step): step is RefreshStep => {
  return step.type === StepType.Refresh;
};

export const createStepBase = (base: BaseStep) => {
  return {
    id: base.id,
    title: base.title,
    tick: Math.max(1, Math.floor(base.tick || 1)),
  } satisfies BaseStep;
};
