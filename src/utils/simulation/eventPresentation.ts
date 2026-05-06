import { RoutingProtocol } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  SimulationEventType,
  SimulationMessageKind,
  type SimulationEvent,
  type SimulationMessage,
  type ThroughputCalculationEventDetails,
} from "../../types/simulation";
import {
  formatFixed,
  getEventDescription as getBatmanEventDescription,
  getEventMessage as getBatmanEventMessage,
  getEventTitle as getBatmanEventTitle,
  getMessageSummary as getBatmanMessageSummary,
  getOgmBroadcastThroughputExplanation,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteChange,
  getRouteRows,
  getRouteSequenceWindowExplanation,
  getSelectedRoute,
  getSimulationReadMorePath as getBatmanSimulationReadMorePath,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
} from "./eventHelpers";

const detectEventProtocol = (event: SimulationEvent, message: SimulationMessage | null) => {
  if (
    message?.kind === SimulationMessageKind.BatmanOriginatorMessage ||
    message?.kind === SimulationMessageKind.BatmanEchoLocationMessage ||
    event.type === SimulationEventType.SystemMessageBroadcast ||
    event.type === SimulationEventType.SystemRouteSelected ||
    event.type === SimulationEventType.SystemThroughputCalculated ||
    event.type === SimulationEventType.SystemMessageDropped ||
    event.type === SimulationEventType.SystemPeerMoved ||
    event.type === SimulationEventType.SystemEntityStatusChanged ||
    event.type === SimulationEventType.RoutingTableInsert ||
    event.type === SimulationEventType.RoutingTableUpdate ||
    event.type === SimulationEventType.RoutingTableRemove
  ) {
    return RoutingProtocol.BATMAN;
  }

  return null;
};

export const getEventMessage = (event: SimulationEvent): SimulationMessage | null => {
  return getBatmanEventMessage(event);
};

export const getEventTitle = (event: SimulationEvent) => {
  const message = getEventMessage(event);
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventTitle(event);
  }

  return ui.simulation.genericEvent;
};

export const getEventDescription = (event: SimulationEvent, peerNameById: Map<string, string>) => {
  const message = getEventMessage(event);
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventDescription(event, peerNameById);
  }

  return ui.simulation.eventEmitted(ui.simulation.eventNodeLabel);
};

export const getSimulationReadMorePath = (
  event: SimulationEvent,
  message: SimulationMessage | null,
  hasRouteChange: boolean,
  hasThroughputBreakdown: boolean,
  hasSequenceWindowExplanation: boolean,
) => {
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanSimulationReadMorePath(
      event,
      message,
      hasRouteChange,
      hasThroughputBreakdown,
      hasSequenceWindowExplanation,
    );
  }

  return "/docs/batman#what-you-need-to-know";
};

export const getMessageSummary = (
  event: SimulationEvent,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const message = getEventMessage(event);
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanMessageSummary(event, peerNameById, onPeerHoverChange);
  }

  return null;
};

export {
  formatFixed,
  getOgmBroadcastThroughputExplanation,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteChange,
  getRouteRows,
  getRouteSequenceWindowExplanation,
  getSelectedRoute,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
};

export type { ThroughputCalculationEventDetails };
