import type { Dispatch, SetStateAction } from "react";

import type { NetworkEntity } from "@/shared/types/model/entities";
import type { WorkflowStep } from "@/shared/types/model/steps";
import type { WorkspaceTextItem } from "./text";
import type { UUID } from "@/shared/types/common/uuid";

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
