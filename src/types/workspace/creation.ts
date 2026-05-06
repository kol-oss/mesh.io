import type { SetEntities, SetSteps, SetTexts } from "./shared";
import type { UUID } from "../uuid";

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
