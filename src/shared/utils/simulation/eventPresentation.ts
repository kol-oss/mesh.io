import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import {
  DsdvUpdateType,
  EventType,
  SimulationMessageKind,
  type AodvHelloMessage,
  type AodvRouteErrorMessage,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
  type BatmanRouteRecord,
  type BroadcastEventDetails,
  type DroppedEventDetails,
  type DsdvRouteUpdateMessage,
  type DsrRouteErrorMessage,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
  type Event,
  type OlsrHelloMessage,
  type OlsrTcMessage,
  type RouteSelectedEventDetails,
  type RoutingTableChangeDetails,
  type SimulationMessage,
  type ThroughputCalculationEventDetails,
} from "@/shared/types/model/simulation";
import {
  formatFixed,
  getEventDescription as getBatmanEventDescription,
  getEventMessage as getBatmanEventMessage,
  getEventTitle as getBatmanEventTitle,
  getMessageSummary as getBatmanMessageSummary,
  getSimulationReadMorePath as getBatmanSimulationReadMorePath,
  getOgmBroadcastThroughputExplanation,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteSequenceWindowExplanation,
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

const getRouteChange = (event: Event): RoutingTableChangeDetails | null => {
  if (
    event.type !== EventType.RoutingTableInsert &&
    event.type !== EventType.RoutingTableUpdate &&
    event.type !== EventType.RoutingTableRemove
  ) {
    return null;
  }

  return event.details as RoutingTableChangeDetails;
};

const detectEventProtocol = (event: Event, message: SimulationMessage | null) => {
  const routeChange = getRouteChange(event);
  if (routeChange) {
    return routeChange.protocol;
  }

  if (event.type === EventType.SystemRouteSelected) {
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

export const getEventMessage = (event: Event): SimulationMessage | null => {
  return getBatmanEventMessage(event);
};

export const getEventTitle = (event: Event) => {
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
      return "Simulation Event";
    }

    if (protocol === RoutingProtocol.AODV) {
      if (event.type === EventType.SystemMessageBroadcast) {
        if (isAodvHelloMessage(message)) {
          return "AODV HELLO Broadcast";
        }

        if (isAodvRouteErrorMessage(message)) {
          return "AODV Route Error Raised";
        }

        return "AODV Route Request Broadcast";
      }

      if (event.type === EventType.RoutingTableInsert) {
        return "AODV Route Added";
      }

      if (event.type === EventType.RoutingTableUpdate) {
        return "AODV Route Updated";
      }

      if (event.type === EventType.RoutingTableRemove) {
        return "AODV Route Removed";
      }

      if (event.type === EventType.SystemThroughputCalculated) {
        if (isAodvRouteReplyMessage(message)) {
          return "AODV Route Reply Forwarded";
        }

        if (isAodvRouteErrorMessage(message)) {
          return "AODV Route Error Raised";
        }

        return "AODV Control Processed";
      }

      if (event.type === EventType.SystemMessageDropped) {
        return "Packet Send Failed";
      }

      if (event.type === EventType.SystemRouteSelected) {
        return "Route Selected";
      }

      return "Simulation Event";
    }

    if (protocol === RoutingProtocol.DSR) {
      if (event.type === EventType.SystemMessageBroadcast) {
        return "DSR Route Request Broadcast";
      }

      if (event.type === EventType.RoutingTableInsert) {
        return "DSR Route Cached";
      }

      if (event.type === EventType.RoutingTableUpdate) {
        return "DSR Route Updated";
      }

      if (event.type === EventType.RoutingTableRemove) {
        return "DSR Route Removed";
      }

      if (event.type === EventType.SystemThroughputCalculated) {
        if (isDsrRouteReplyMessage(message)) {
          return "DSR Route Reply Forwarded";
        }

        if (isDsrRouteErrorMessage(message)) {
          return "DSR Route Error Raised";
        }

        return "DSR Control Processed";
      }

      if (event.type === EventType.SystemMessageDropped) {
        return "Packet Send Failed";
      }

      if (event.type === EventType.SystemRouteSelected) {
        return "Route Selected";
      }

      return "Simulation Event";
    }

    if (event.type === EventType.SystemMessageBroadcast) {
      if (isOlsrHelloMessage(message)) {
        return "OLSR HELLO Broadcast";
      }

      if (isOlsrTcMessage(message)) {
        return "OLSR TC Broadcast";
      }

      return "Broadcast Message";
    }

    if (event.type === EventType.RoutingTableInsert) {
      return "OLSR Route Added";
    }

    if (event.type === EventType.RoutingTableUpdate) {
      return "OLSR Route Updated";
    }

    if (event.type === EventType.RoutingTableRemove) {
      return "OLSR Route Removed";
    }

    if (event.type === EventType.SystemThroughputCalculated) {
      return "OLSR Route Calculation";
    }

    if (event.type === EventType.SystemMessageDropped) {
      return "Packet Send Failed";
    }

    if (event.type === EventType.SystemRouteSelected) {
      return "Route Selected";
    }

    return "Simulation Event";
  }

  if (event.type === EventType.SystemMessageBroadcast && isDsdvMessage(message)) {
    return message.updateType === DsdvUpdateType.Incremental
      ? "DSDV Incremental Broadcast"
      : "DSDV Full Dump Broadcast";
  }

  if (event.type === EventType.RoutingTableInsert) {
    return "DSDV Route Added";
  }

  if (event.type === EventType.RoutingTableUpdate) {
    return "DSDV Route Updated";
  }

  if (event.type === EventType.RoutingTableRemove) {
    return "DSDV Route Removed";
  }

  if (event.type === EventType.SystemMessageDropped) {
    return "DSDV Update Dropped";
  }

  if (event.type === EventType.SystemRouteSelected) {
    return "Route Selected";
  }

  return "Simulation Event";
};

export const getEventDescription = (event: Event, peerNameById: Map<UUID, string>) => {
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
      return "Node emitted a simulation event.";
    }

    if (protocol === RoutingProtocol.AODV) {
      const routeChange = getRouteChange(event);
      if (routeChange && routeChange.protocol === RoutingProtocol.AODV) {
        const namedReason = replacePeerIdsWithNames(routeChange.reason, peerNameById);
        if (event.type === EventType.RoutingTableInsert) {
          return `Node inserted a new AODV route after route discovery or neighbour sensing. ${namedReason}`;
        }

        if (event.type === EventType.RoutingTableUpdate) {
          return `Node updated an existing AODV route using sequence-number and hop-count comparison. ${namedReason}`;
        }

        return `Node removed or invalidated an AODV route after timeout or link-break processing. ${namedReason}`;
      }

      if (event.type === EventType.SystemMessageBroadcast) {
        const details = event.details as BroadcastEventDetails;
        const namedNote = replacePeerIdsWithNames(details.note ?? "", peerNameById);
        return `Node processed AODV control traffic. ${namedNote}`;
      }

      if (event.type === EventType.SystemMessageDropped) {
        const details = event.details as DroppedEventDetails;
        return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
      }

      if (event.type === EventType.SystemRouteSelected) {
        const details = event.details as RouteSelectedEventDetails;
        if ("nextHopPeerId" in details.selectedRoute) {
          return `Selected AODV route to ${getPeerNameForDescription(details.destinationPeerId, peerNameById)} via ${getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById)} with hop count ${details.selectedRoute.metric} and destination sequence ${details.selectedRoute.sequenceNumber}.`;
        }
      }

      if (event.type === EventType.SystemThroughputCalculated) {
        const details = event.details as ThroughputCalculationEventDetails;
        return replacePeerIdsWithNames(details.reason, peerNameById);
      }

      return "Node emitted a simulation event.";
    }

    if (protocol === RoutingProtocol.DSR) {
      const routeChange = getRouteChange(event);
      if (routeChange && routeChange.protocol === RoutingProtocol.DSR) {
        const namedReason = replacePeerIdsWithNames(routeChange.reason, peerNameById);
        if (event.type === EventType.RoutingTableInsert) {
          return `Node inserted a DSR Route Cache entry from a discovered source route. ${namedReason}`;
        }

        if (event.type === EventType.RoutingTableUpdate) {
          return `Node updated a DSR Route Cache entry after receiving fresher route knowledge. ${namedReason}`;
        }

        return `Node removed a DSR Route Cache entry after link failure or expiration. ${namedReason}`;
      }

      if (event.type === EventType.SystemMessageBroadcast) {
        const details = event.details as BroadcastEventDetails;
        const namedNote = replacePeerIdsWithNames(details.note ?? "", peerNameById);
        return `Node flooded a DSR Route Request. ${namedNote}`;
      }

      if (event.type === EventType.SystemMessageDropped) {
        const details = event.details as DroppedEventDetails;
        return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
      }

      if (event.type === EventType.SystemRouteSelected) {
        const details = event.details as RouteSelectedEventDetails;
        if ("pathPeerIds" in details.selectedRoute) {
          return `Selected DSR source route to ${getPeerNameForDescription(details.destinationPeerId, peerNameById)} via ${getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById)} (${details.selectedRoute.metric} hops). Full path: ${details.selectedRoute.pathPeerIds
            .map((peerId) => getPeerNameForDescription(peerId, peerNameById))
            .join(" -> ")}.`;
        }
      }

      if (event.type === EventType.SystemThroughputCalculated) {
        const details = event.details as ThroughputCalculationEventDetails;
        return replacePeerIdsWithNames(details.reason, peerNameById);
      }

      return "Node emitted a simulation event.";
    }

    const routeChange = getRouteChange(event);
    if (routeChange && routeChange.protocol === RoutingProtocol.OLSR) {
      if (event.type === EventType.RoutingTableInsert) {
        return `Node inserted a new OLSR route after recalculating routes from the Neighbor Set, 2-Hop Neighbor Set, and Topology Table. ${routeChange.reason}`;
      }

      if (event.type === EventType.RoutingTableUpdate) {
        return `Node updated an OLSR route after recalculating routes from learned OLSR topology state. ${routeChange.reason}`;
      }

      return `Node removed an OLSR route after neighbour or topology information changed. ${routeChange.reason}`;
    }

    if (event.type === EventType.SystemMessageBroadcast) {
      const details = event.details as BroadcastEventDetails;
      return `OLSR control-message handling executed for this node. ${details.note ?? ""}`;
    }

    if (event.type === EventType.SystemMessageDropped) {
      const details = event.details as DroppedEventDetails;
      return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
    }

    if (event.type === EventType.SystemRouteSelected) {
      const details = event.details as RouteSelectedEventDetails;
      if ("nextHopPeerId" in details.selectedRoute) {
        return `Selected OLSR route to ${getPeerNameForDescription(details.destinationPeerId, peerNameById)} via ${getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById)} with hop metric ${details.selectedRoute.metric}.`;
      }
    }

    if (event.type === EventType.SystemThroughputCalculated) {
      const details = event.details as ThroughputCalculationEventDetails;
      return details.reason;
    }

    return "Node emitted a simulation event.";
  }

  const routeChange = getRouteChange(event);
  if (routeChange && routeChange.protocol === RoutingProtocol.DSDV) {
    if (event.type === EventType.RoutingTableInsert) {
      return `Node inserted a new DSDV route after accepting an incoming update. ${routeChange.reason}`;
    }

    if (event.type === EventType.RoutingTableUpdate) {
      return `Node updated an existing DSDV route using the DSDV acceptance rule. ${routeChange.reason}`;
    }

    return `Node removed a DSDV route after timeout-based garbage collection. ${routeChange.reason}`;
  }

  if (event.type === EventType.SystemMessageBroadcast && isDsdvMessage(message)) {
    const details = event.details as BroadcastEventDetails;
    const fallbackNote =
      message.updateType === DsdvUpdateType.Incremental
        ? `Incremental update with ${message.entries.length} changed route entr${message.entries.length === 1 ? "y" : "ies"}.`
        : `Full dump update with ${message.entries.length} route entr${message.entries.length === 1 ? "y" : "ies"}.`;
    return `Node broadcast a DSDV routing update. ${details.note ?? fallbackNote}`;
  }

  if (event.type === EventType.SystemMessageDropped) {
    const details = event.details as DroppedEventDetails;
    return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
  }

  if (event.type === EventType.SystemRouteSelected) {
    const details = event.details as RouteSelectedEventDetails;
    if ("nextHopPeerId" in details.selectedRoute) {
      return `Selected DSDV route to ${getPeerLabel(details.destinationPeerId, peerNameById)} via ${getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById)} with metric ${details.selectedRoute.metric} and sequence ${details.selectedRoute.sequenceNumber}.`;
    }
  }

  return "Node emitted a simulation event.";
};

export const getSimulationReadMorePath = (
  event: Event,
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
      event.type === EventType.RoutingTableInsert ||
      event.type === EventType.RoutingTableUpdate ||
      event.type === EventType.RoutingTableRemove
    ) {
      return "/docs/dsdv#routing-maintenance";
    }

    if (event.type === EventType.SystemRouteSelected) {
      return "/docs/dsdv#route-selection";
    }

    if (isDsdvMessage(message)) {
      return "/docs/dsdv#full-and-incremental-updates";
    }

    return "/docs/dsdv#what-you-need-to-know";
  }

  if (protocol === RoutingProtocol.DSR) {
    if (
      event.type === EventType.RoutingTableInsert ||
      event.type === EventType.RoutingTableUpdate ||
      event.type === EventType.RoutingTableRemove
    ) {
      return "/docs/dsr#route-cache";
    }

    if (event.type === EventType.SystemRouteSelected) {
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
      event.type === EventType.RoutingTableInsert ||
      event.type === EventType.RoutingTableUpdate ||
      event.type === EventType.RoutingTableRemove
    ) {
      return "/docs/aodv#routing-table";
    }

    if (event.type === EventType.SystemRouteSelected) {
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
      event.type === EventType.RoutingTableInsert ||
      event.type === EventType.RoutingTableUpdate ||
      event.type === EventType.RoutingTableRemove ||
      event.type === EventType.SystemRouteSelected
    ) {
      return "/docs/olsr#route-selection";
    }

    if (event.type === EventType.SystemThroughputCalculated) {
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
  event: Event,
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
      if (event.type !== EventType.SystemRouteSelected) {
        return null;
      }

      const details = event.details as RouteSelectedEventDetails;
      if (!("nextHopPeerId" in details.selectedRoute)) {
        return null;
      }

      return [
        {
          label: "Destination",
          value: renderPeerName(
            details.destinationPeerId,
            getPeerLabel(details.destinationPeerId, peerNameById),
            onPeerHoverChange,
          ),
        },
        {
          label: "Next Hop",
          value: renderPeerName(
            details.selectedRoute.nextHopPeerId,
            getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById),
            onPeerHoverChange,
          ),
        },
        {
          label: "Metric",
          value: String(details.selectedRoute.metric),
        },
        {
          label: "Sequence Number",
          value: String(details.selectedRoute.sequenceNumber),
        },
      ];
    }

    if (protocol === RoutingProtocol.DSR) {
      return null;
    }

    if (event.type === EventType.SystemRouteSelected) {
      const details = event.details as RouteSelectedEventDetails;
      if (!("nextHopPeerId" in details.selectedRoute)) {
        return null;
      }

      return [
        {
          label: "Destination",
          value: renderPeerName(
            details.destinationPeerId,
            getPeerLabel(details.destinationPeerId, peerNameById),
            onPeerHoverChange,
          ),
        },
        {
          label: "Next Hop",
          value: renderPeerName(
            details.selectedRoute.nextHopPeerId,
            getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById),
            onPeerHoverChange,
          ),
        },
        {
          label: "Metric",
          value: String(details.selectedRoute.metric),
        },
      ];
    }

    return null;
  }

  if (isDsdvMessage(message)) {
    return null;
  }

  if (event.type === EventType.SystemRouteSelected) {
    const details = event.details as RouteSelectedEventDetails;
    if (!("nextHopPeerId" in details.selectedRoute)) {
      return null;
    }

    return [
      {
        label: "Destination",
        value: renderPeerName(
          details.destinationPeerId,
          getPeerLabel(details.destinationPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Next Hop",
        value: renderPeerName(
          details.selectedRoute.nextHopPeerId,
          getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Metric",
        value: String(details.selectedRoute.metric),
      },
      {
        label: "Sequence Number",
        value: String(details.selectedRoute.sequenceNumber),
      },
    ];
  }

  return null;
};

const getPeerNameForDescription = (peerId: UUID, peerNameById: Map<UUID, string>) => {
  return peerNameById.get(peerId) ?? "Unknown";
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

export const getSelectedRoute = (event: Event) => {
  if (event.type !== EventType.SystemRouteSelected) {
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
