import { StepType } from "../../types/enums";
import type { WorkflowStep } from "../../types/steps";

export const INITIAL_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "step-1",
    title: "Select Devices",
    type: StepType.Move,
    tick: 1,
    sourcePeerId: null,
    destinationPeerId: null,
    targetEntityId: null,
    movePeerId: null,
    x: 0,
    y: 0,
  },
  {
    id: "step-2",
    title: "Configure Links",
    type: StepType.Message,
    tick: 2,
    sourcePeerId: null,
    destinationPeerId: null,
    targetEntityId: null,
    movePeerId: null,
    x: 0,
    y: 0,
  },
  {
    id: "step-3",
    title: "Validate Topology",
    type: StepType.ToggleStatus,
    tick: 3,
    sourcePeerId: null,
    destinationPeerId: null,
    targetEntityId: null,
    movePeerId: null,
    x: 0,
    y: 0,
  },
];
