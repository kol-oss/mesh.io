import { RoutingProtocol, StepType } from "../types/enums";
import type { PeerRoutingProtocol } from "../types/navigation";
import type { WorkflowStep } from "../types/steps";

export const peerRoutingProtocols: PeerRoutingProtocol[] = [
  RoutingProtocol.DSDV,
  RoutingProtocol.BATMAN,
  RoutingProtocol.OLSR,
  RoutingProtocol.AODV,
  RoutingProtocol.DSR,
];

export const workflowStepTypes: WorkflowStep["type"][] = [
  StepType.Move,
  StepType.Message,
  StepType.ToggleStatus,
  StepType.Refresh,
];
