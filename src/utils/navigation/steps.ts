import type { WorkflowStep } from "../../types/steps";

export const INITIAL_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: "step-1", title: "Select Devices", type: "MOVE" },
  { id: "step-2", title: "Configure Links", type: "MESSAGE" },
  { id: "step-3", title: "Validate Topology", type: "TOGGLE" },
];
