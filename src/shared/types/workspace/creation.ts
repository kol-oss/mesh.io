import type { SetEntities, SetSteps, SetTexts } from "./shared";
import type { UUID } from "@/shared/types/common/uuid";

export type WorkspaceCreationSetters = {
  setEntities: SetEntities;
  setSteps: SetSteps;
  setTexts: SetTexts;
};

export type WorkspaceCreationCallbacks = {
  onEntitySelect: (id: UUID) => void;
  onStepSelect: (id: UUID) => void;
  showCreationToast: (text: string) => void;
};
