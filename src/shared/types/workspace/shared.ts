import type { Dispatch, SetStateAction } from "react";

import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";
import type { TextItem } from "./text";

export type WorkspacePoint = {
  x: number;
  y: number;
};

export type WorkspaceSize = {
  width: number;
  height: number;
};

export type SetEntities = (value: NetworkEntity[]) => void;
export type SetSteps = (value: Step[]) => void;
export type SetTexts = (value: TextItem[]) => void;

export type SetNullableStringState = Dispatch<SetStateAction<UUID | null>>;
