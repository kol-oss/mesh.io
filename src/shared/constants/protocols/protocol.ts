import { ROUTING_PROTOCOLS, RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { Step } from "@/shared/types/model/steps";
import { StepType } from "@/shared/types/model/steps";
import { AODV_DEFAULT_CONFIGURATION } from "./aodv";
import { BATMAN_DEFAULT_CONFIGURATION } from "./batman";
import { DSDV_DEFAULT_CONFIGURATION } from "./dsdv";
import { DSR_DEFAULT_CONFIGURATION } from "./dsr";
import { OLSR_DEFAULT_CONFIGURATION } from "./olsr";

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
      return { ...DSR_DEFAULT_CONFIGURATION };
  }
};

export const workflowStepTypes: Step["type"][] = [
  StepType.Move,
  StepType.Message,
  StepType.Toggle,
  StepType.Refresh,
];
