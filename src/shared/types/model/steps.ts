import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";

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

export interface BaseStep {
  id: UUID;
  title: string;
  tick: number;
}

export interface MessageStep extends BaseStep {
  type: StepType.Message;
  sourceId: UUID | null;
  destinationId: UUID | null;
}

export interface MoveStep extends BaseStep {
  type: StepType.Move;
  entityId: UUID | null;
  x: number;
  y: number;
}

export interface ToggleStep extends BaseStep {
  type: StepType.Toggle;
  entityId: UUID | null;
}

export interface RefreshStep extends BaseStep {
  type: StepType.Refresh;
  peerId: UUID;
  protocol: RoutingProtocol;
  action?: RefreshAction;
  startTick: number;
  interval: number;
}

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
