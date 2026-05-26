import {
  type AodvHelloMessage,
  type AodvRouteErrorMessage,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
} from "@/features/processor/types/protocols/aodv";
import {
  type BatmanCalculationEventDetails,
  type BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman";
import {
  DsdvUpdateType,
  type DsdvRouteUpdateMessage,
} from "@/features/processor/types/protocols/dsdv";
import {
  type DsrRouteErrorMessage,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import {
  type OlsrHelloMessage,
  type OlsrTcMessage,
} from "@/features/processor/types/protocols/olsr";
import {
  EventType,
  type DropEventDetails,
  type Event,
  type GetRouteEventDetails,
  type MoveEventDetails,
  type RouteChangeEventDetails,
  type StatusChangeEventDetails,
  type TransferEventDetails,
} from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import {
  formatFixed,
  getEventDescription as getBatmanEventDescription,
  getEventMessage as getBatmanEventMessage,
  getEventTitle as getBatmanEventTitle,
  getMessageSummary as getBatmanMessageSummary,
  getSimulationReadMorePath as getBatmanSimulationReadMorePath,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteSequenceWindowExplanation,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
} from "./eventHelpers";

const isBatmanMessage = (message: Message | null) => {
  return (
    message?.type === MessageType.BatmanOriginatorMessage ||
    message?.type === MessageType.BatmanEchoLocationMessage
  );
};

const isDsdvMessage = (message: Message | null): message is DsdvRouteUpdateMessage => {
  return message?.type === MessageType.DsdvRouteUpdateMessage;
};

const isAodvRouteRequestMessage = (message: Message | null): message is AodvRouteRequestMessage => {
  return message?.type === MessageType.AodvRouteRequestMessage;
};

const isAodvRouteReplyMessage = (message: Message | null): message is AodvRouteReplyMessage => {
  return message?.type === MessageType.AodvRouteReplyMessage;
};

const isAodvRouteErrorMessage = (message: Message | null): message is AodvRouteErrorMessage => {
  return message?.type === MessageType.AodvRouteErrorMessage;
};

const isAodvHelloMessage = (message: Message | null): message is AodvHelloMessage => {
  return message?.type === MessageType.AodvHelloMessage;
};

const isOlsrHelloMessage = (message: Message | null): message is OlsrHelloMessage => {
  return message?.type === MessageType.OlsrHelloMessage;
};

const isOlsrTcMessage = (message: Message | null): message is OlsrTcMessage => {
  return message?.type === MessageType.OlsrTcMessage;
};

const isDsrRouteRequestMessage = (message: Message | null): message is DsrRouteRequestMessage => {
  return message?.type === MessageType.DsrRouteRequestMessage;
};

const isDsrRouteReplyMessage = (message: Message | null): message is DsrRouteReplyMessage => {
  return message?.type === MessageType.DsrRouteReplyMessage;
};

const isDsrRouteErrorMessage = (message: Message | null): message is DsrRouteErrorMessage => {
  return message?.type === MessageType.DsrRouteErrorMessage;
};

const getRouteChange = (event: Event): RouteChangeEventDetails | null => {
  if (
    event.type !== EventType.AddRoute &&
    event.type !== EventType.UpdateRoute &&
    event.type !== EventType.DeleteRoute
  ) {
    return null;
  }

  return event.details as RouteChangeEventDetails;
};

const detectEventProtocol = (event: Event, message: Message | null) => {
  const routeChange = getRouteChange(event);
  if (routeChange) {
    return routeChange.protocol;
  }

  if (event.type === EventType.GetRoute) {
    return (event.details as GetRouteEventDetails).protocol;
  }

  if (event.type === EventType.Transfer) {
    return (event.details as TransferEventDetails).protocol;
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

export const getEventMessage = (event: Event): Message | null => {
  return getBatmanEventMessage(event);
};

export const getEventTitle = (event: Event) => {
  if (event.type === EventType.Move) {
    return "Peer Moved";
  }

  if (event.type === EventType.StatusChange) {
    return "Status Changed";
  }

  const message = getEventMessage(event);
  const protocol = detectEventProtocol(event, message);

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventTitle(event);
  }

  if (protocol === null) {
    if (event.type === EventType.Drop) return "Message Transfer Failed";
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
      if (event.type === EventType.Broadcast) {
        if (isAodvHelloMessage(message)) {
          return "AODV HELLO Broadcast";
        }

        if (isAodvRouteErrorMessage(message)) {
          return "AODV Route Error Raised";
        }

        return "AODV Route Request Broadcast";
      }

      if (event.type === EventType.AddRoute) {
        return "AODV Route Added";
      }

      if (event.type === EventType.UpdateRoute) {
        return "AODV Route Updated";
      }

      if (event.type === EventType.DeleteRoute) {
        return "AODV Route Removed";
      }

      if (event.type === EventType.Calculation) {
        if (isAodvRouteReplyMessage(message)) {
          return "AODV Route Reply Forwarded";
        }

        if (isAodvRouteErrorMessage(message)) {
          return "AODV Route Error Raised";
        }

        return "AODV Control Processed";
      }

      if (event.type === EventType.Drop) {
        return "Packet Send Failed";
      }

      if (event.type === EventType.GetRoute) {
        return "Route Selected";
      }

      if (event.type === EventType.Transfer) {
        return "Packet Transfer";
      }

      return "Simulation Event";
    }

    if (protocol === RoutingProtocol.DSR) {
      if (event.type === EventType.Broadcast) {
        return "DSR Route Request Broadcast";
      }

      if (event.type === EventType.AddRoute) {
        return "DSR Route Cached";
      }

      if (event.type === EventType.UpdateRoute) {
        return "DSR Route Updated";
      }

      if (event.type === EventType.DeleteRoute) {
        return "DSR Route Removed";
      }

      if (event.type === EventType.Calculation) {
        if (isDsrRouteReplyMessage(message)) {
          return "DSR Route Reply Forwarded";
        }

        if (isDsrRouteErrorMessage(message)) {
          return "DSR Route Error Raised";
        }

        return "DSR Control Processed";
      }

      if (event.type === EventType.Drop) {
        return "Packet Send Failed";
      }

      if (event.type === EventType.GetRoute) {
        return "Route Selected";
      }

      if (event.type === EventType.Transfer) {
        return "Packet Transfer";
      }

      return "Simulation Event";
    }

    if (event.type === EventType.Broadcast) {
      if (isOlsrHelloMessage(message)) {
        return "OLSR HELLO Broadcast";
      }

      if (isOlsrTcMessage(message)) {
        return "OLSR TC Broadcast";
      }

      return "Broadcast Message";
    }

    if (event.type === EventType.AddRoute) {
      return "OLSR Route Added";
    }

    if (event.type === EventType.UpdateRoute) {
      return "OLSR Route Updated";
    }

    if (event.type === EventType.DeleteRoute) {
      return "OLSR Route Removed";
    }

    if (event.type === EventType.Calculation) {
      return "OLSR Route Calculation";
    }

    if (event.type === EventType.Drop) {
      return "Packet Send Failed";
    }

    if (event.type === EventType.GetRoute) {
      return "Route Selected";
    }

    if (event.type === EventType.Transfer) {
      return "Packet Transfer";
    }

    return "Simulation Event";
  }

  if (event.type === EventType.Broadcast && isDsdvMessage(message)) {
    return message.updateType === DsdvUpdateType.Incremental
      ? "DSDV Incremental Broadcast"
      : "DSDV Full Dump Broadcast";
  }

  if (event.type === EventType.AddRoute) {
    return "DSDV Route Added";
  }

  if (event.type === EventType.UpdateRoute) {
    return "DSDV Route Updated";
  }

  if (event.type === EventType.DeleteRoute) {
    return "DSDV Route Removed";
  }

  if (event.type === EventType.Drop) {
    return "DSDV Update Dropped";
  }

  if (event.type === EventType.GetRoute) {
    return "Route Selected";
  }

  if (event.type === EventType.Transfer) {
    return "Packet Transfer";
  }

  return "Simulation Event";
};

export const getEventDescription = (event: Event, peerNameById: Map<UUID, string>) => {
  if (event.type === EventType.Move) {
    const details = event.details as MoveEventDetails;
    return `Peer is moved to the position (${details.toX}, ${details.toY}).`;
  }

  if (event.type === EventType.StatusChange) {
    const details = event.details as StatusChangeEventDetails;
    const entityLabel = details.entityType === EntityType.Link ? "Link" : "Peer";
    return `${entityLabel} status changed to ${details.nextEnabled ? "enabled" : "disabled"}.`;
  }

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
        if (event.type === EventType.AddRoute) {
          return "Node inserted a new AODV route after route discovery or neighbour sensing.";
        }

        if (event.type === EventType.UpdateRoute) {
          return "Node updated an existing AODV route using sequence-number and hop-count comparison.";
        }

        return "Node removed or invalidated an AODV route after timeout or link-break processing.";
      }

      if (event.type === EventType.Broadcast) {
        return "Node processed AODV control traffic.";
      }

      if (event.type === EventType.Drop) {
        const details = event.details as DropEventDetails;
        return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
      }

      if (event.type === EventType.GetRoute) {
        const details = event.details as GetRouteEventDetails;
        if ("nextHopPeerId" in details.selectedRoute) {
          return `Selected AODV route to ${getPeerNameForDescription(details.destinationPeerId, peerNameById)} via ${getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById)} with hop count ${details.selectedRoute.metric} and destination sequence ${details.selectedRoute.sequenceNumber}.`;
        }
      }

      if (event.type === EventType.Calculation) {
        return "Node processed an AODV control calculation step.";
      }

      return "Node emitted a simulation event.";
    }

    if (protocol === RoutingProtocol.DSR) {
      const routeChange = getRouteChange(event);
      if (routeChange && routeChange.protocol === RoutingProtocol.DSR) {
        if (event.type === EventType.AddRoute) {
          return "Node inserted a DSR Route Cache entry from a discovered source route.";
        }

        if (event.type === EventType.UpdateRoute) {
          return "Node updated a DSR Route Cache entry after receiving fresher route knowledge.";
        }

        return "Node removed a DSR Route Cache entry after link failure or expiration.";
      }

      if (event.type === EventType.Broadcast) {
        return "Node flooded a DSR Route Request.";
      }

      if (event.type === EventType.Drop) {
        const details = event.details as DropEventDetails;
        return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
      }

      if (event.type === EventType.GetRoute) {
        const details = event.details as GetRouteEventDetails;
        if ("pathPeerIds" in details.selectedRoute) {
          return `Selected DSR source route to ${getPeerNameForDescription(details.destinationPeerId, peerNameById)} via ${getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById)} (${details.selectedRoute.metric} hops). Full path: ${details.selectedRoute.pathPeerIds
            .map((peerId) => getPeerNameForDescription(peerId, peerNameById))
            .join(" -> ")}.`;
        }
      }

      if (event.type === EventType.Calculation) {
        return "Node processed a DSR control calculation step.";
      }

      return "Node emitted a simulation event.";
    }

    const routeChange = getRouteChange(event);
    if (routeChange && routeChange.protocol === RoutingProtocol.OLSR) {
      if (event.type === EventType.AddRoute) {
        return "Node inserted a new OLSR route after recalculating routes from the Neighbor Set, 2-Hop Neighbor Set, and Topology Table.";
      }

      if (event.type === EventType.UpdateRoute) {
        return "Node updated an OLSR route after recalculating routes from learned OLSR topology state.";
      }

      return "Node removed an OLSR route after neighbour or topology information changed.";
    }

    if (event.type === EventType.Broadcast) {
      return "OLSR control-message handling executed for this node.";
    }

    if (event.type === EventType.Drop) {
      const details = event.details as DropEventDetails;
      return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
    }

    if (event.type === EventType.GetRoute) {
      const details = event.details as GetRouteEventDetails;
      if ("nextHopPeerId" in details.selectedRoute) {
        return `Selected OLSR route to ${getPeerNameForDescription(details.destinationPeerId, peerNameById)} via ${getPeerNameForDescription(details.selectedRoute.nextHopPeerId, peerNameById)} with hop metric ${details.selectedRoute.metric}.`;
      }
    }

    if (event.type === EventType.Calculation) {
      return "Node recalculated OLSR routing state from neighbour and topology information.";
    }

    return "Node emitted a simulation event.";
  }

  const routeChange = getRouteChange(event);
  if (routeChange && routeChange.protocol === RoutingProtocol.DSDV) {
    if (event.type === EventType.AddRoute) {
      return "Node inserted a new DSDV route after accepting an incoming update.";
    }

    if (event.type === EventType.UpdateRoute) {
      return "Node updated an existing DSDV route using the DSDV acceptance rule.";
    }

    return "Node removed a DSDV route after timeout-based garbage collection.";
  }

  if (event.type === EventType.Broadcast && isDsdvMessage(message)) {
    const fallbackNote =
      message.updateType === DsdvUpdateType.Incremental
        ? `Incremental update with ${message.entries.length} changed route entr${message.entries.length === 1 ? "y" : "ies"}.`
        : `Full dump update with ${message.entries.length} route entr${message.entries.length === 1 ? "y" : "ies"}.`;
    return `Node broadcast a DSDV routing update. ${fallbackNote}`;
  }

  if (event.type === EventType.Drop) {
    const details = event.details as DropEventDetails;
    return `The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`;
  }

  if (event.type === EventType.GetRoute) {
    const details = event.details as GetRouteEventDetails;
    if ("nextHopPeerId" in details.selectedRoute) {
      return `Selected DSDV route to ${getPeerLabel(details.destinationPeerId, peerNameById)} via ${getPeerLabel(details.selectedRoute.nextHopPeerId, peerNameById)} with metric ${details.selectedRoute.metric} and sequence ${details.selectedRoute.sequenceNumber}.`;
    }
  }

  return "Node emitted a simulation event.";
};

export const getSimulationReadMorePath = (
  event: Event,
  message: Message | null,
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
      event.type === EventType.AddRoute ||
      event.type === EventType.UpdateRoute ||
      event.type === EventType.DeleteRoute
    ) {
      return "/docs/dsdv#routing-maintenance";
    }

    if (event.type === EventType.GetRoute) {
      return "/docs/dsdv#route-selection";
    }

    if (isDsdvMessage(message)) {
      return "/docs/dsdv#full-and-incremental-updates";
    }

    return "/docs/dsdv#what-you-need-to-know";
  }

  if (protocol === RoutingProtocol.DSR) {
    if (
      event.type === EventType.AddRoute ||
      event.type === EventType.UpdateRoute ||
      event.type === EventType.DeleteRoute
    ) {
      return "/docs/dsr#route-cache";
    }

    if (event.type === EventType.GetRoute) {
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
      event.type === EventType.AddRoute ||
      event.type === EventType.UpdateRoute ||
      event.type === EventType.DeleteRoute
    ) {
      return "/docs/aodv#routing-table";
    }

    if (event.type === EventType.GetRoute) {
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
      event.type === EventType.AddRoute ||
      event.type === EventType.UpdateRoute ||
      event.type === EventType.DeleteRoute ||
      event.type === EventType.GetRoute
    ) {
      return "/docs/olsr#route-selection";
    }

    if (event.type === EventType.Calculation) {
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

  return "/docs/system#events";
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
      if (event.type !== EventType.GetRoute) {
        return null;
      }

      const details = event.details as GetRouteEventDetails;
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

    if (event.type === EventType.GetRoute) {
      const details = event.details as GetRouteEventDetails;
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

  if (event.type === EventType.GetRoute) {
    const details = event.details as GetRouteEventDetails;
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

export {
  formatFixed,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteSequenceWindowExplanation,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
};

export const getSelectedRoute = (event: Event) => {
  if (event.type !== EventType.GetRoute) {
    return null;
  }

  return (event.details as GetRouteEventDetails).selectedRoute;
};

export const getRouteRows = (details: RouteChangeEventDetails) => {
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

export type { BatmanCalculationEventDetails as ThroughputCalculationEventDetails };
