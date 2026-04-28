import type { PeerRoutingProtocol } from "../types/navigation";
import type { WorkflowStep } from "../types/steps";

export const peerRoutingProtocols: PeerRoutingProtocol[] = [
  "HWMP",
  "BATMAN",
  "OLSR",
  "AODV",
  "DSR",
];

export const workflowStepTypes: WorkflowStep["type"][] = ["MOVE", "MESSAGE", "TOGGLE", "REFRESH"];
