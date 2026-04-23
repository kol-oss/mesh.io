import type { WorkflowStep } from "../../types/steps";

export const INITIAL_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "step-1", title: "Select Devices", type: "MOVE", tick: 1 },
  { id: "step-2", title: "Configure Links", type: "MESSAGE", tick: 2 },
  { id: "step-3", title: "Validate Topology", type: "TOGGLE", tick: 3 },
];
