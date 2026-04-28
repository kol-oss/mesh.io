import type { NetworkEntity } from "./navigation";
import type { WorkflowStep } from "./steps";
import type { WorkspaceTextItem } from "./workspace";

export type WorkspaceCreationSetters = {
  setEntities: (value: NetworkEntity[]) => void;
  setSteps: (value: WorkflowStep[]) => void;
  setTexts: (value: WorkspaceTextItem[]) => void;
};

export type WorkspaceCreationCallbacks = {
  onEntitySelect: (id: string) => void;
  onStepSelect: (id: string) => void;
  showCreationToast: (text: string) => void;
};
