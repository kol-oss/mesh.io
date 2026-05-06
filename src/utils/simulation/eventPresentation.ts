import { RoutingProtocol } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  DsdvUpdateType,
  SimulationEventType,
  SimulationMessageKind,
  type BatmanRouteRecord,
  type BroadcastEventDetails,
  type DsdvRouteUpdateMessage,
  type DroppedEventDetails,
  type RoutingTableChangeDetails,
  type RouteSelectedEventDetails,
  type SimulationEvent,
  type SimulationMessage,
  type ThroughputCalculationEventDetails,
} from "../../types/simulation";
import type { UUID } from "../../types/uuid";
import {
  formatFixed,
  getEventDescription as getBatmanEventDescription,
  getEventMessage as getBatmanEventMessage,
  getEventTitle as getBatmanEventTitle,
  getMessageSummary as getBatmanMessageSummary,
  getOgmBroadcastThroughputExplanation,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteSequenceWindowExplanation,
  getSimulationReadMorePath as getBatmanSimulationReadMorePath,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
} from "./eventHelpers";

const isBatmanMessage = (message: SimulationMessage | null) => {
  return (
    message?.kind === SimulationMessageKind.BatmanOriginatorMessage ||
    message?.kind === SimulationMessageKind.BatmanEchoLocationMessage
  );
};

const isDsdvMessage = (message: SimulationMessage | null): message is DsdvRouteUpdateMessage => {
  return message?.kind === SimulationMessageKind.DsdvRouteUpdateMessage;
};

const getRouteChange = (event: SimulationEvent): RoutingTableChangeDetails | null => {
  if (
    event.type !== SimulationEventType.RoutingTableInsert &&
    event.type !== SimulationEventType.RoutingTableUpdate &&
    event.type !== SimulationEventType.RoutingTableRemove
  ) {
    return null;
  }

  return event.details as RoutingTableChangeDetails;
};

const detectEventProtocol = (event: SimulationEvent, message: SimulationMessage | null) => {
  const routeChange = getRouteChange(event);
  if (routeChange) {
    return routeChange.protocol;
  }

  if (event.type === SimulationEventType.SystemRouteSelected) {
    return (event.details as RouteSelectedEventDetails).protocol;
  }

  if (isDsdvMessage(message)) {
    return RoutingProtocol.DSDV;
  }

  if (isBatmanMessage(message)) {
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

  if (protocol !== RoutingProtocol.DSDV) {
    return ui.simulation.genericEvent;
  }

  if (event.type === SimulationEventType.SystemMessageBroadcast && isDsdvMessage(message)) {
    return message.updateType === DsdvUpdateType.Incremental
      ? ui.simulation.dsdvIncrementalBroadcast
      : ui.simulation.dsdvFullDumpBroadcast;
  }

  if (event.type === SimulationEventType.RoutingTableInsert) {
    return ui.simulation.dsdvRouteAdded;
  }

  if (event.type === SimulationEventType.RoutingTableUpdate) {
    return ui.simulation.dsdvRouteUpdated;
  }

  if (event.type === SimulationEventType.RoutingTableRemove) {
    return ui.simulation.dsdvRouteRemoved;
  }

  if (event.type === SimulationEventType.SystemMessageDropped) {
    return ui.simulation.dsdvUpdateDropped;
  }

  if (event.type === SimulationEventType.SystemRouteSelected) {
    return ui.simulation.routeSelected;
  }

  return ui.simulation.genericEvent;
};

export const getEventDescription = (event: SimulationEvent, peerNameById: Map<UUID, string>) => {
  const message = getEventMessage(event);
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventDescription(event, peerNameById);
  }

  if (protocol !== RoutingProtocol.DSDV) {
    return ui.simulation.eventEmitted(ui.simulation.eventNodeLabel);
  }

  const routeChange = getRouteChange(event);
  if (routeChange && routeChange.protocol === RoutingProtocol.DSDV) {
    if (event.type === SimulationEventType.RoutingTableInsert) {
      return ui.simulation.dsdvRouteInsertBody(routeChange.reason);
    }

    if (event.type === SimulationEventType.RoutingTableUpdate) {
      return ui.simulation.dsdvRouteUpdateBody(routeChange.reason);
    }

    return ui.simulation.dsdvRouteRemoveBody(routeChange.reason);
  }

  if (event.type === SimulationEventType.SystemMessageBroadcast && isDsdvMessage(message)) {
    const details = event.details as BroadcastEventDetails;
    const fallbackNote =
      message.updateType === DsdvUpdateType.Incremental
        ? `Incremental update with ${message.entries.length} changed route entr${message.entries.length === 1 ? "y" : "ies"}.`
        : `Full dump update with ${message.entries.length} route entr${message.entries.length === 1 ? "y" : "ies"}.`;
    return ui.simulation.dsdvBroadcastBody(details.note ?? fallbackNote);
  }

  if (event.type === SimulationEventType.SystemMessageDropped) {
    const details = event.details as DroppedEventDetails;
    return ui.simulation.packetSendFailedReason(details.reason);
  }

  if (event.type === SimulationEventType.SystemRouteSelected) {
    const details = event.details as RouteSelectedEventDetails;
    if ("nextHopPeerId" in details.selectedRoute) {
      return ui.simulation.eventRouteSelectedDsdv(
        getPeerLabel(details.destinationPeerId, peerNameById),
        getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById),
        details.selectedRoute.metric,
        details.selectedRoute.sequenceNumber,
      );
    }
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

  if (protocol === RoutingProtocol.DSDV) {
    if (isDsdvMessage(message)) {
      return "/docs/dsdv#routing-updates";
    }

    return "/docs/dsdv#routing-table";
  }

  return "/docs/batman#what-you-need-to-know";
};

export const getMessageSummary = (
  event: SimulationEvent,
  peerNameById: Map<UUID, string>,
  onPeerHoverChange: (peerId: UUID | null) => void,
) => {
  const message = getEventMessage(event);
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanMessageSummary(event, peerNameById, onPeerHoverChange);
  }

  if (protocol !== RoutingProtocol.DSDV) {
    return null;
  }

  if (isDsdvMessage(message)) {
    return null;
  }

  if (event.type === SimulationEventType.SystemRouteSelected) {
    const details = event.details as RouteSelectedEventDetails;
    if (!("nextHopPeerId" in details.selectedRoute)) {
      return null;
    }

    return [
      {
        label: ui.simulation.summaryDestination,
        value: renderPeerName(
          details.destinationPeerId,
          getPeerLabel(details.destinationPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: ui.simulation.tableNextHop,
        value: renderPeerName(
          details.selectedRoute.nextHopPeerId,
          getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: ui.simulation.tableMetric,
        value: String(details.selectedRoute.metric),
      },
      {
        label: ui.simulation.tableSequence,
        value: String(details.selectedRoute.sequenceNumber),
      },
    ];
  }

  return null;
};

export {
  formatFixed,
  getOgmBroadcastThroughputExplanation,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteSequenceWindowExplanation,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
};

export const getSelectedRoute = (event: SimulationEvent) => {
  if (event.type !== SimulationEventType.SystemRouteSelected) {
    return null;
  }

  return (event.details as RouteSelectedEventDetails).selectedRoute;
};

export const getRouteRows = (details: RoutingTableChangeDetails) => {
  if (details.protocol === RoutingProtocol.BATMAN) {
    if (details.nextRoute) {
      return [details.nextRoute];
    }

    return details.previousRoute ? [details.previousRoute] : [];
  }

  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

export { getRouteChange };

export const isBatmanRouteRecord = (
  route: ReturnType<typeof getRouteRows>[number],
): route is BatmanRouteRecord => {
  return "originatorPeerId" in route;
};

export type { ThroughputCalculationEventDetails };
