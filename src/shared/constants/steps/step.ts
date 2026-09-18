import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import {
  StepType,
  type MessageStep,
  type MoveStep,
  type ToggleStep,
} from "@/shared/types/model/steps";

// default MESSAGE step properties
export const getDefaultMessageStep = (
  sourcePeerId: UUID,
  destinationPeerId: UUID,
  tick: number,
): MessageStep => ({
  id: generateUUID(),
  title: "Message",
  type: StepType.Message,
  tick,
  sourceId: sourcePeerId,
  destinationId: destinationPeerId,
});

// default MOVE step properties
export const getDefaultMoveStep = (
  entityId: UUID,
  x: number,
  y: number,
  tick: number,
): MoveStep => ({
  id: generateUUID(),
  title: "Move",
  type: StepType.Move,
  tick,
  entityId: entityId,
  x,
  y,
});

// default TOGGLE_STATUS step properties
export const getDefaultToggleStep = (
  entityId: UUID,
  tick: number,
  status: boolean,
): ToggleStep => ({
  id: generateUUID(),
  title: "Toggle",
  type: StepType.Toggle,
  tick,
  entityId: entityId,
  status,
});
