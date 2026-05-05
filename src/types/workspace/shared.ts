import type { Dispatch, SetStateAction } from "react";

import type { NetworkEntity } from "../navigation";
import type { WorkflowStep } from "./steps";
import type { WorkspaceTextItem } from "./index";

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

export type SetNullableStringState = Dispatch<SetStateAction<string | null>>;
