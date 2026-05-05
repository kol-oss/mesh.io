import type { SetEntities, SetSteps, SetTexts } from "./shared";

export type WorkspaceCreationSetters = {
  setEntities: SetEntities;
  setSteps: SetSteps;
  setTexts: SetTexts;
};

export type WorkspaceCreationCallbacks = {
  onEntitySelect: (id: string) => void;
  onStepSelect: (id: string) => void;
  showCreationToast: (text: string) => void;
};
