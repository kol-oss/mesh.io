import type { Dispatch, SetStateAction } from "react";

import type { NetworkEntity } from "../entities";
import type { WorkflowStep } from "../steps";
import type { WorkspaceTextItem } from "./text";
import type { UUID } from "../uuid";

export type WorkspacePoint = {
  x: number;
  y: number;
};

export type WorkspaceSize = {
  width: number;
  height: number;
};

export type SetEntities = (value: NetworkEntity[]) => void;
export type SetSteps = (value: WorkflowStep[]) => void;
export type SetTexts = (value: WorkspaceTextItem[]) => void;

export type SetNullableStringState = Dispatch<SetStateAction<UUID | null>>;
