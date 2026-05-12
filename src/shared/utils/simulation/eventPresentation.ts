import { RoutingProtocol } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  DsdvUpdateType,
  SimulationEventType,
  SimulationMessageKind,
  type AodvHelloMessage,
  type AodvRouteErrorMessage,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
  type BatmanRouteRecord,
  type BroadcastEventDetails,
  type DsrRouteErrorMessage,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
  type DsdvRouteUpdateMessage,
  type DroppedEventDetails,
  type OlsrHelloMessage,
  type OlsrTcMessage,
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

const isAodvRouteRequestMessage = (
  message: SimulationMessage | null,
): message is AodvRouteRequestMessage => {
  return message?.kind === SimulationMessageKind.AodvRouteRequestMessage;
};

const isAodvRouteReplyMessage = (
  message: SimulationMessage | null,
): message is AodvRouteReplyMessage => {
  return message?.kind === SimulationMessageKind.AodvRouteReplyMessage;
};

const isAodvRouteErrorMessage = (
  message: SimulationMessage | null,
): message is AodvRouteErrorMessage => {
  return message?.kind === SimulationMessageKind.AodvRouteErrorMessage;
};

const isAodvHelloMessage = (message: SimulationMessage | null): message is AodvHelloMessage => {
  return message?.kind === SimulationMessageKind.AodvHelloMessage;
};

const isOlsrHelloMessage = (message: SimulationMessage | null): message is OlsrHelloMessage => {
  return message?.kind === SimulationMessageKind.OlsrHelloMessage;
};

const isOlsrTcMessage = (message: SimulationMessage | null): message is OlsrTcMessage => {
  return message?.kind === SimulationMessageKind.OlsrTcMessage;
};

const isDsrRouteRequestMessage = (
  message: SimulationMessage | null,
): message is DsrRouteRequestMessage => {
  return message?.kind === SimulationMessageKind.DsrRouteRequestMessage;
};

const isDsrRouteReplyMessage = (
  message: SimulationMessage | null,
): message is DsrRouteReplyMessage => {
  return message?.kind === SimulationMessageKind.DsrRouteReplyMessage;
};

const isDsrRouteErrorMessage = (
  message: SimulationMessage | null,
): message is DsrRouteErrorMessage => {
  return message?.kind === SimulationMessageKind.DsrRouteErrorMessage;
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

  if (
    isAodvRouteRequestMessage(message) ||
    isAodvRouteReplyMessage(message) ||
    isAodvRouteErrorMessage(message) ||
    isAodvHelloMessage(message)
  ) {
    return RoutingProtocol.AODV;
  }

  if (isBatmanMessage(message)) {
    return RoutingProtocol.BATMAN;
  }

  if (isOlsrHelloMessage(message) || isOlsrTcMessage(message)) {
    return RoutingProtocol.OLSR;
  }

  if (
    isDsrRouteRequestMessage(message) ||
    isDsrRouteReplyMessage(message) ||
    isDsrRouteErrorMessage(message)
  ) {
    return RoutingProtocol.DSR;
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
    if (
      protocol !== RoutingProtocol.AODV &&
      protocol !== RoutingProtocol.OLSR &&
      protocol !== RoutingProtocol.DSR
    ) {
      return ui.simulation.genericEvent;
    }

    if (protocol === RoutingProtocol.AODV) {
      if (event.type === SimulationEventType.SystemMessageBroadcast) {
        if (isAodvHelloMessage(message)) {
          return ui.simulation.aodvHelloBroadcast;
        }

        if (isAodvRouteErrorMessage(message)) {
          return ui.simulation.aodvRerrRaised;
        }

        return ui.simulation.aodvRreqBroadcast;
      }

      if (event.type === SimulationEventType.RoutingTableInsert) {
        return ui.simulation.aodvRouteAdded;
      }

      if (event.type === SimulationEventType.RoutingTableUpdate) {
        return ui.simulation.aodvRouteUpdated;
      }

      if (event.type === SimulationEventType.RoutingTableRemove) {
        return ui.simulation.aodvRouteRemoved;
      }

      if (event.type === SimulationEventType.SystemThroughputCalculated) {
        if (isAodvRouteReplyMessage(message)) {
          return ui.simulation.aodvRrepForwarded;
        }

        if (isAodvRouteErrorMessage(message)) {
          return ui.simulation.aodvRerrRaised;
        }

        return ui.simulation.aodvControlProcessed;
      }

      if (event.type === SimulationEventType.SystemMessageDropped) {
        return ui.simulation.packetSendFailed;
      }

      if (event.type === SimulationEventType.SystemRouteSelected) {
        return ui.simulation.routeSelected;
      }

      return ui.simulation.genericEvent;
    }

    if (protocol === RoutingProtocol.DSR) {
      if (event.type === SimulationEventType.SystemMessageBroadcast) {
        return ui.simulation.dsrRreqBroadcast;
      }

      if (event.type === SimulationEventType.RoutingTableInsert) {
        return ui.simulation.dsrRouteAdded;
      }

      if (event.type === SimulationEventType.RoutingTableUpdate) {
        return ui.simulation.dsrRouteUpdated;
      }

      if (event.type === SimulationEventType.RoutingTableRemove) {
        return ui.simulation.dsrRouteRemoved;
      }

      if (event.type === SimulationEventType.SystemThroughputCalculated) {
        if (isDsrRouteReplyMessage(message)) {
          return ui.simulation.dsrRrepForwarded;
        }

        if (isDsrRouteErrorMessage(message)) {
          return ui.simulation.dsrRerrRaised;
        }

        return ui.simulation.dsrControlProcessed;
      }

      if (event.type === SimulationEventType.SystemMessageDropped) {
        return ui.simulation.packetSendFailed;
      }

      if (event.type === SimulationEventType.SystemRouteSelected) {
        return ui.simulation.routeSelected;
      }

      return ui.simulation.genericEvent;
    }

    if (event.type === SimulationEventType.SystemMessageBroadcast) {
      if (isOlsrHelloMessage(message)) {
        return ui.simulation.olsrHelloBroadcast;
      }

      if (isOlsrTcMessage(message)) {
        return ui.simulation.olsrTcBroadcast;
      }

      return ui.simulation.broadcastMessage;
    }

    if (event.type === SimulationEventType.RoutingTableInsert) {
      return ui.simulation.olsrRouteAdded;
    }

    if (event.type === SimulationEventType.RoutingTableUpdate) {
      return ui.simulation.olsrRouteUpdated;
    }

    if (event.type === SimulationEventType.RoutingTableRemove) {
      return ui.simulation.olsrRouteRemoved;
    }

    if (event.type === SimulationEventType.SystemThroughputCalculated) {
      return ui.simulation.olsrRouteCalculation;
    }

    if (event.type === SimulationEventType.SystemMessageDropped) {
      return ui.simulation.packetSendFailed;
    }

    if (event.type === SimulationEventType.SystemRouteSelected) {
      return ui.simulation.routeSelected;
    }

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
    if (
      protocol !== RoutingProtocol.AODV &&
      protocol !== RoutingProtocol.OLSR &&
      protocol !== RoutingProtocol.DSR
    ) {
      return ui.simulation.eventEmitted(ui.simulation.eventNodeLabel);
    }

    if (protocol === RoutingProtocol.AODV) {
      const routeChange = getRouteChange(event);
      if (routeChange && routeChange.protocol === RoutingProtocol.AODV) {
        const namedReason = replacePeerIdsWithNames(routeChange.reason, peerNameById);
        if (event.type === SimulationEventType.RoutingTableInsert) {
          return ui.simulation.aodvRouteInsertBody(namedReason);
        }

        if (event.type === SimulationEventType.RoutingTableUpdate) {
          return ui.simulation.aodvRouteUpdateBody(namedReason);
        }

        return ui.simulation.aodvRouteRemoveBody(namedReason);
      }

      if (event.type === SimulationEventType.SystemMessageBroadcast) {
        const details = event.details as BroadcastEventDetails;
        const namedNote = replacePeerIdsWithNames(details.note ?? "", peerNameById);
        return ui.simulation.aodvBroadcastBody(namedNote);
      }

      if (event.type === SimulationEventType.SystemMessageDropped) {
        const details = event.details as DroppedEventDetails;
        return ui.simulation.packetSendFailedReason(details.reason);
      }

      if (event.type === SimulationEventType.SystemRouteSelected) {
        const details = event.details as RouteSelectedEventDetails;
        if ("nextHopPeerId" in details.selectedRoute) {
          return ui.simulation.eventRouteSelectedAodv(
            getPeerNameForDescription(details.destinationPeerId, peerNameById),
            getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById),
            details.selectedRoute.metric,
            details.selectedRoute.sequenceNumber,
          );
        }
      }

      if (event.type === SimulationEventType.SystemThroughputCalculated) {
        const details = event.details as ThroughputCalculationEventDetails;
        return replacePeerIdsWithNames(details.reason, peerNameById);
      }

      return ui.simulation.eventEmitted(ui.simulation.eventNodeLabel);
    }

    if (protocol === RoutingProtocol.DSR) {
      const routeChange = getRouteChange(event);
      if (routeChange && routeChange.protocol === RoutingProtocol.DSR) {
        const namedReason = replacePeerIdsWithNames(routeChange.reason, peerNameById);
        if (event.type === SimulationEventType.RoutingTableInsert) {
          return ui.simulation.dsrRouteInsertBody(namedReason);
        }

        if (event.type === SimulationEventType.RoutingTableUpdate) {
          return ui.simulation.dsrRouteUpdateBody(namedReason);
        }

        return ui.simulation.dsrRouteRemoveBody(namedReason);
      }

      if (event.type === SimulationEventType.SystemMessageBroadcast) {
        const details = event.details as BroadcastEventDetails;
        const namedNote = replacePeerIdsWithNames(details.note ?? "", peerNameById);
        return ui.simulation.dsrBroadcastBody(namedNote);
      }

      if (event.type === SimulationEventType.SystemMessageDropped) {
        const details = event.details as DroppedEventDetails;
        return ui.simulation.packetSendFailedReason(details.reason);
      }

      if (event.type === SimulationEventType.SystemRouteSelected) {
        const details = event.details as RouteSelectedEventDetails;
        if ("pathPeerIds" in details.selectedRoute) {
          return ui.simulation.eventRouteSelectedDsr(
            getPeerNameForDescription(details.destinationPeerId, peerNameById),
            getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById),
            details.selectedRoute.metric,
            details.selectedRoute.pathPeerIds
              .map((peerId) => getPeerNameForDescription(peerId, peerNameById))
              .join(" -> "),
          );
        }
      }

      if (event.type === SimulationEventType.SystemThroughputCalculated) {
        const details = event.details as ThroughputCalculationEventDetails;
        return replacePeerIdsWithNames(details.reason, peerNameById);
      }

      return ui.simulation.eventEmitted(ui.simulation.eventNodeLabel);
    }

    const routeChange = getRouteChange(event);
    if (routeChange && routeChange.protocol === RoutingProtocol.OLSR) {
      if (event.type === SimulationEventType.RoutingTableInsert) {
        return ui.simulation.olsrRouteInsertBody(routeChange.reason);
      }

      if (event.type === SimulationEventType.RoutingTableUpdate) {
        return ui.simulation.olsrRouteUpdateBody(routeChange.reason);
      }

      return ui.simulation.olsrRouteRemoveBody(routeChange.reason);
    }

    if (event.type === SimulationEventType.SystemMessageBroadcast) {
      const details = event.details as BroadcastEventDetails;
      return ui.simulation.olsrBroadcastBody(details.note ?? "");
    }

    if (event.type === SimulationEventType.SystemMessageDropped) {
      const details = event.details as DroppedEventDetails;
      return ui.simulation.packetSendFailedReason(details.reason);
    }

    if (event.type === SimulationEventType.SystemRouteSelected) {
      const details = event.details as RouteSelectedEventDetails;
      if ("nextHopPeerId" in details.selectedRoute) {
        return ui.simulation.eventRouteSelectedOlsr(
          getPeerNameForDescription(details.destinationPeerId, peerNameById),
          getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById),
          details.selectedRoute.metric,
        );
      }
    }

    if (event.type === SimulationEventType.SystemThroughputCalculated) {
      const details = event.details as ThroughputCalculationEventDetails;
      return details.reason;
    }

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
    if (
      event.type === SimulationEventType.RoutingTableInsert ||
      event.type === SimulationEventType.RoutingTableUpdate ||
      event.type === SimulationEventType.RoutingTableRemove
    ) {
      return "/docs/dsdv#routing-maintenance";
    }

    if (event.type === SimulationEventType.SystemRouteSelected) {
      return "/docs/dsdv#route-selection";
    }

    if (isDsdvMessage(message)) {
      return "/docs/dsdv#full-and-incremental-updates";
    }

    return "/docs/dsdv#what-you-need-to-know";
  }

  if (protocol === RoutingProtocol.DSR) {
    if (
      event.type === SimulationEventType.RoutingTableInsert ||
      event.type === SimulationEventType.RoutingTableUpdate ||
      event.type === SimulationEventType.RoutingTableRemove
    ) {
      return "/docs/dsr#route-cache";
    }

    if (event.type === SimulationEventType.SystemRouteSelected) {
      return "/docs/dsr#route-selection";
    }

    if (isDsrRouteRequestMessage(message)) {
      return "/docs/dsr#route-discovery";
    }

    if (isDsrRouteReplyMessage(message)) {
      return "/docs/dsr#route-discovery";
    }

    if (isDsrRouteErrorMessage(message)) {
      return "/docs/dsr#route-maintenance";
    }

    return "/docs/dsr#what-you-need-to-know";
  }

  if (protocol === RoutingProtocol.AODV) {
    if (
      event.type === SimulationEventType.RoutingTableInsert ||
      event.type === SimulationEventType.RoutingTableUpdate ||
      event.type === SimulationEventType.RoutingTableRemove
    ) {
      return "/docs/aodv#routing-table";
    }

    if (event.type === SimulationEventType.SystemRouteSelected) {
      return "/docs/aodv#route-selection";
    }

    if (isAodvRouteRequestMessage(message) || isAodvRouteReplyMessage(message)) {
      return "/docs/aodv#route-discovery";
    }

    if (isAodvRouteErrorMessage(message) || isAodvHelloMessage(message)) {
      return "/docs/aodv#route-maintenance";
    }

    return "/docs/aodv#what-you-need-to-know";
  }

  if (protocol === RoutingProtocol.OLSR) {
    if (
      event.type === SimulationEventType.RoutingTableInsert ||
      event.type === SimulationEventType.RoutingTableUpdate ||
      event.type === SimulationEventType.RoutingTableRemove ||
      event.type === SimulationEventType.SystemRouteSelected
    ) {
      return "/docs/olsr#route-selection";
    }

    if (event.type === SimulationEventType.SystemThroughputCalculated) {
      if (isOlsrTcMessage(message)) {
        return "/docs/olsr#topology-discovery";
      }

      if (isOlsrHelloMessage(message)) {
        return "/docs/olsr#neighbor-sensing";
      }

      return "/docs/olsr#route-selection";
    }

    if (isOlsrTcMessage(message)) {
      return "/docs/olsr#topology-discovery";
    }

    if (isOlsrHelloMessage(message)) {
      return "/docs/olsr#neighbor-sensing";
    }

    return "/docs/olsr#what-you-need-to-know";
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
    if (
      protocol !== RoutingProtocol.AODV &&
      protocol !== RoutingProtocol.OLSR &&
      protocol !== RoutingProtocol.DSR
    ) {
      return null;
    }

    if (protocol === RoutingProtocol.AODV) {
      if (event.type !== SimulationEventType.SystemRouteSelected) {
        return null;
      }

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

    if (protocol === RoutingProtocol.DSR) {
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
      ];
    }

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

const getPeerNameForDescription = (peerId: UUID, peerNameById: Map<UUID, string>) => {
  return peerNameById.get(peerId) ?? ui.common.unknown;
};

const replacePeerIdsWithNames = (text: string, peerNameById: Map<UUID, string>) => {
  // Replace UUID-like tokens in runtime reason strings with friendly peer names.
  return text.replace(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    (peerId) => peerNameById.get(peerId as UUID) ?? peerId,
  );
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
