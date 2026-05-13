import { AODV_DEFAULT_CONFIGURATION } from "./aodv";
import { BATMAN_DEFAULT_CONFIGURATION } from "./batman";
import { DSDV_DEFAULT_CONFIGURATION } from "./dsdv";
import { OLSR_DEFAULT_CONFIGURATION } from "./olsr";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import { RoutingProtocol, ROUTING_PROTOCOLS } from "@/shared/types/common/protocols";
import { StepType } from "@/shared/types/model/steps";
import type { WorkflowStep } from "@/shared/types/model/steps";

export const peerRoutingProtocols: RoutingProtocol[] = [...ROUTING_PROTOCOLS];

export const getDefaultPeerConfiguration = (protocol: RoutingProtocol): PeerConfiguration => {
  switch (protocol) {
    case RoutingProtocol.BATMAN:
      return { ...BATMAN_DEFAULT_CONFIGURATION };
    case RoutingProtocol.DSDV:
      return { ...DSDV_DEFAULT_CONFIGURATION };
    case RoutingProtocol.AODV:
      return { ...AODV_DEFAULT_CONFIGURATION };
    case RoutingProtocol.OLSR:
      return { ...OLSR_DEFAULT_CONFIGURATION };
    case RoutingProtocol.DSR:
      return {};
  }
};

export const workflowStepTypes: WorkflowStep["type"][] = [
  StepType.Move,
  StepType.Message,
  StepType.Toggle,
  StepType.Refresh,
];
