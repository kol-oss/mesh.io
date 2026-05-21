import {
  type BatmanCalculationEventDetails,
  type BatmanRouteRecord,
  type BatmanRouteUpdateEventDetails,
} from "@/features/processor/types/batman";
import {
  EventType,
  type DropEventDetails,
  type Event,
  type GetRouteEventDetails,
  type MoveEventDetails,
  type RouteChangeEventDetails,
  type StatusChangeEventDetails,
} from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import type { ReactNode } from "react";

const isBatmanRoute = (
  route: GetRouteEventDetails["selectedRoute"],
): route is BatmanRouteRecord => {
  return "originatorPeerId" in route;
};

export const getEventTitle = (event: Event) => {
  const message = getEventMessage(event);
  const routeChange = getRouteChange(event);

  switch (event.type) {
    case EventType.AddRoute:
      return getRouteInsertTitle(message, routeChange);
    case EventType.UpdateRoute:
      return getRouteUpdateTitle(message, routeChange);
    case EventType.DeleteRoute:
      return getRouteRemoveTitle(message, routeChange);
    case EventType.Broadcast:
      return getBroadcastTitle(event, message);
    case EventType.GetRoute:
      return "Route Selected";
    case EventType.Transfer:
      return "Message Transferred";
    case EventType.Calculation:
      return "Throughput Calculation";
    case EventType.Drop:
      return getDroppedTitle(event, message);
    case EventType.Move:
      return "Peer Moved";
    case EventType.StatusChange:
      return "Status Changed";
    default:
      return "Simulation Event";
  }
};

export const getSimulationReadMorePath = (
  event: Event,
  message: Message | null,
  hasRouteChange: boolean,
  hasThroughputBreakdown: boolean,
  hasSequenceWindowExplanation: boolean,
) => {
  if (hasThroughputBreakdown) {
    return "/docs/batman#throughput-calculation";
  }

  if (hasSequenceWindowExplanation) {
    return "/docs/batman#sequence-protection-window";
  }

  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return "/docs/batman#echo-location-protocol";
  }

  if (message?.kind === MessageType.BatmanOriginatorMessage) {
    return "/docs/batman#originator-message";
  }

  if (
    hasRouteChange ||
    event.type === EventType.GetRoute ||
    event.type === EventType.Transfer ||
    event.type === EventType.AddRoute ||
    event.type === EventType.UpdateRoute ||
    event.type === EventType.DeleteRoute
  ) {
    return "/docs/batman#route-selection";
  }

  return "/docs/batman#what-you-need-to-know";
};

export const getEventDescription = (event: Event, peerNameById: Map<UUID, string>) => {
  const actor = "Node";
  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);

  if (routeChange) {
    if (event.type === EventType.AddRoute) {
      return getRouteInsertDescription();
    }

    if (event.type === EventType.UpdateRoute) {
      return getRouteUpdateDescription();
    }

    return getRouteRemoveDescription(routeChange.reason);
  }

  switch (event.type) {
    case EventType.Broadcast:
      return getBroadcastDescription(event, message);
    case EventType.GetRoute: {
      const details = event.details as GetRouteEventDetails;
      if (!isBatmanRoute(details.selectedRoute)) {
        return `${actor} emitted a simulation event.`;
      }
      return `Selected route to ${getPeerDisplayName(details.selectedRoute.originatorPeerId, peerNameById)} via ${getPeerDisplayName(details.selectedRoute.hopPeerId, peerNameById)} with throughput ${details.selectedRoute.quality}.`;
    }
    case EventType.Transfer:
      return `${actor} forwarded a packet to the selected next hop.`;
    case EventType.Calculation:
      return getThroughputCalculatedDescription(actor, event);
    case EventType.Drop:
      return getDroppedDescription(actor, event, message);
    case EventType.Move: {
      const details = event.details as MoveEventDetails;
      return `Peer is moved to point (${details.toX}, ${details.toY}).`;
    }
    case EventType.StatusChange: {
      const details = event.details as StatusChangeEventDetails;
      const entityLabel = details.entityType === EntityType.Link ? "Link" : "Peer";
      return `${entityLabel} is now ${details.nextEnabled ? "enabled" : "disabled"}.`;
    }
    default:
      return `${actor} emitted a simulation event.`;
  }
};

export const getRouteChange = (event: Event): RouteChangeEventDetails | null => {
  if (
    event.type !== EventType.AddRoute &&
    event.type !== EventType.UpdateRoute &&
    event.type !== EventType.DeleteRoute
  ) {
    return null;
  }

  const details = event.details as RouteChangeEventDetails;
  return details.protocol === RoutingProtocol.BATMAN ? details : null;
};

export const getRouteRows = (details: BatmanRouteUpdateEventDetails): BatmanRouteRecord[] => {
  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

export const getSelectedRoute = (event: Event): BatmanRouteRecord | null => {
  if (event.type !== EventType.GetRoute) {
    return null;
  }

  const details = event.details as GetRouteEventDetails;
  return isBatmanRoute(details.selectedRoute) ? details.selectedRoute : null;
};

export const getMessageSummary = (
  event: Event,
  peerNameById: Map<UUID, string>,
  onPeerHoverChange: (peerId: UUID | null) => void,
): Array<{ label: string; value: ReactNode }> | null => {
  const message = getEventMessage(event);
  if (!message) {
    return null;
  }

  if (event.type === EventType.GetRoute) {
    const details = event.details as GetRouteEventDetails;
    if (!isBatmanRoute(details.selectedRoute)) {
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
          details.selectedRoute.hopPeerId,
          getPeerLabel(details.selectedRoute.hopPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Throughput",
        value: String(details.selectedRoute.quality),
      },
      {
        label: "Last Seen",
        value: String(details.selectedRoute.lastTick),
      },
    ];
  }

  if (message.kind === MessageType.Packet) {
    return [
      {
        label: "Source",
        value: message.sourcePeerId
          ? renderPeerName(
              message.sourcePeerId,
              getPeerLabel(message.sourcePeerId, peerNameById),
              onPeerHoverChange,
            )
          : "Unknown",
      },
      {
        label: "Destination",
        value: renderPeerName(
          message.destinationPeerId,
          getPeerLabel(message.destinationPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Type",
        value: "Packet",
      },
      {
        label: "TTL",
        value: String(message.timeToLive),
      },
    ];
  }

  if (event.type === EventType.Move) {
    const details = event.details as MoveEventDetails;
    return [
      {
        label: "Peer",
        value: renderPeerName(
          details.peerId,
          getPeerLabel(details.peerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Position",
        value: `(${details.toX}, ${details.toY})`,
      },
    ];
  }

  if (event.type === EventType.StatusChange) {
    const details = event.details as StatusChangeEventDetails;
    return [
      {
        label: "Type",
        value: details.entityType === EntityType.Link ? "Link" : "Peer",
      },
      {
        label: "Status",
        value: details.nextEnabled ? "Enabled" : "Disabled",
      },
    ];
  }

  return null;
};

export const getEventMessage = (event: Event): Message | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as Message;
};

const getBroadcastTitle = (event: Event, message: Message | null) => {
  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return "ELP Broadcast";
  }

  if (message?.kind === MessageType.BatmanOriginatorMessage) {
    return "retransmit" in event.details && event.details.retransmit
      ? "OGMv2 Broadcast Retransmission"
      : "OGMv2 Broadcast";
  }

  if (message?.kind === MessageType.Packet) {
    return "Packet Broadcast";
  }

  return "Broadcast Message";
};

const getDroppedTitle = (event: Event, message: Message | null) => {
  if (isSourcePacketSendFailure(event, message)) {
    return "Packet Send Failed";
  }

  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return "ELP Dropped";
  }

  if (message?.kind === MessageType.BatmanOriginatorMessage) {
    return "OGMv2 Dropped";
  }

  if (message?.kind === MessageType.Packet) {
    return "Packet Dropped";
  }

  return "Drop Message";
};

const getBroadcastDescription = (event: Event, message: Message | null) => {
  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return (
      <>{`Every ELP Interval B.A.T.M.A.N. node broadcast an Echo Location Protocol (ELP) message to neighbours. If this node wants to announce its' neighbors it should append a neighbor entry message for each neighbor to be announced and fill the "Number of Neighbors" field accordingly.`}</>
    );
  }

  if (message?.kind === MessageType.BatmanOriginatorMessage) {
    if ("retransmit" in event.details && event.details.retransmit) {
      return (
        <>
          {
            "The node rebroadcasts an OGMv2 after receiving it from a neighbour. This forwards throughput-aware evidence deeper into the mesh so downstream nodes can compare candidate next hops for the same originator."
          }
        </>
      );
    }

    return (
      <>
        {
          "Every OGM interval, an Originator Message v2 (OGMv2) is broadcast to announce presence and publish throughput information. Neighbours may rebroadcast OGMv2 across the mesh when best-path rules allow it, enabling B.A.T.M.A.N. V nodes to choose the strongest next hop."
        }
      </>
    );
  }

  if (message?.kind === MessageType.Packet) {
    return <>{"The node broadcast a packet message to neighbouring nodes."}</>;
  }

  return <>{"The node broadcast a message to neighbouring nodes."}</>;
};

const getDroppedDescription = (actor: string, event: Event, message: Message | null) => {
  if (isSourcePacketSendFailure(event, message)) {
    const details = event.details as DropEventDetails;
    return (
      <>{`The node could not send this MESSAGE-step packet because no valid next-hop route could be selected from the routing table at this tick. Details: ${details.reason}.`}</>
    );
  }

  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return <>{`${actor} dropped a message during processing.`}</>;
  }

  if (message?.kind === MessageType.BatmanOriginatorMessage) {
    return (
      <>{`${actor} already received OGMv2 with such originator and sequence number with better throughput, so it did not continue processing this OGMv2, and B.A.T.M.A.N. V propagation stopped at this hop.`}</>
    );
  }

  if (message?.kind === MessageType.Packet) {
    return <>{`${actor} could not forward this packet, so delivery stopped at this hop.`}</>;
  }

  return <>{`${actor} dropped a message during processing.`}</>;
};

const getThroughputCalculatedDescription = (actor: string, event: Event) => {
  const details = event.details as BatmanCalculationEventDetails;
  if (details.message.kind === MessageType.BatmanEchoLocationMessage) {
    return (
      <>
        {
          "Throughput is an estimate of how much useful data can be successfully transferred over a link per unit of time. In ELP and B.A.T.M.A.N. V, throughput is used as a link-quality metric to help select better routes by favoring links that deliver more reliable and higher data rates."
        }
      </>
    );
  }

  if (details.message.kind === MessageType.BatmanOriginatorMessage) {
    return (
      <>
        {
          "For OGMv2 forwarding, throughput estimation compares the throughput carried by the received OGMv2 message with the throughput recorded in the Neighbours Table from ELP calculations. The minimum of these two values is selected as the forwarding candidate."
        }
      </>
    );
  }

  return <>{`${actor} calculated throughput: ${details.reason}`}</>;
};

export const getThroughputBreakdown = (event: Event) => {
  if (event.type !== EventType.Calculation) {
    return null;
  }

  const details = event.details as BatmanCalculationEventDetails;
  if (details.message.kind !== MessageType.BatmanEchoLocationMessage) {
    return null;
  }

  return details.breakdown ?? null;
};

export const getOgmBroadcastThroughputExplanation = (event: Event, message: Message | null) => {
  if (event.type !== EventType.Broadcast) {
    return null;
  }

  if (message?.kind !== MessageType.BatmanOriginatorMessage) {
    return null;
  }

  if ("retransmit" in event.details && event.details.retransmit) {
    return null;
  }

  return "At the originator node, OGMv2 starts with throughput value 2**32. Each next peer then combines the carried OGM throughput with neighbour throughput derived from ELP using a min() operation, and forwards the selected value.";
};

export const getOgmThroughputSelectionExplanation = (event: Event) => {
  if (event.type !== EventType.Calculation) {
    return null;
  }

  const details = event.details as BatmanCalculationEventDetails;
  if (details.message.kind !== MessageType.BatmanOriginatorMessage) {
    return null;
  }

  if (!details.ogmSelection) {
    return null;
  }

  const selection = details.ogmSelection;
  if (selection.isWirelessHop) {
    return `The received value of throughput from OGMv2 was ${selection.receivedThroughput}, and value from Neighbours Table was ${selection.neighbourThroughput}, so minimum selected value was ${selection.selectedThroughput}. Because this is a wireless hop, peer penalty ${selection.hopPenaltyPercent.toFixed(1)}% was applied, producing finalized value ${selection.forwardedThroughput}. Final value is ${selection.forwardedThroughput}, and this value will be used as route throughput.`;
  }

  return `The received value of throughput from OGMv2 was ${selection.receivedThroughput}, and value from Neighbours Table was ${selection.neighbourThroughput}, so minimum selected value was ${selection.selectedThroughput}. This is a static hop, so no wireless peer penalty is applied. Final value is ${selection.forwardedThroughput}, and this value will be used as route throughput.`;
};

export const formatFixed = (value: number) => value.toFixed(2);

export const getThroughputBaseExplanation = (
  breakdown: NonNullable<BatmanCalculationEventDetails["breakdown"]>,
) => {
  const cutAmount = Math.max(0, breakdown.baseReferenceThroughput - breakdown.baseThroughput);

  if (cutAmount > 0) {
    return `The (Math.round(breakdown.baseThroughput)) throughput is ${Math.round(breakdown.baseThroughput)}. Starting from ${Math.round(breakdown.baseReferenceThroughput)}, (formatFixed(breakdown.distance))-based penalty was applied for link (formatFixed(breakdown.distance)) ${formatFixed(breakdown.distance)} (configured penalty (formatFixed(breakdown.distance)) ${Math.round(breakdown.distancePenaltyDistance)}, penalty ${formatFixed(breakdown.distancePenaltyPercent)}% per unit), reducing throughput by ${Math.round(cutAmount)}. The reception (formatFixed(breakdown.receptionRatio)) is ${formatFixed(breakdown.receptionRatio)}, meaning no packet loss is observed at this sample.`;
  }

  return `The (Math.round(breakdown.baseThroughput)) throughput is ${Math.round(breakdown.baseThroughput)}, and no distance cut is applied on this link. The reception (formatFixed(breakdown.receptionRatio)) is ${formatFixed(breakdown.receptionRatio)}.`;
};

export const getThroughputEwmaExplanation = (
  breakdown: NonNullable<BatmanCalculationEventDetails["breakdown"]>,
) => {
  if (breakdown.previousEwma == null) {
    return `This value is then used as the initial input to the EWMA (Exponentially Weighted Moving Average), resulting in an initial smoothed metric of ${formatFixed(breakdown.nextEwma)}, which will be refined over time as more measurements are collected.`;
  }

  return `This value is then folded into EWMA smoothing (alpha 0.20): (formatFixed(breakdown.previousEwma)) metric ${formatFixed(breakdown.previousEwma)}, new sample ${formatFixed(breakdown.rawThroughput)}, resulting smoothed metric ${formatFixed(breakdown.nextEwma)}.`;
};

const getRouteInsertTitle = (
  message: Message | null,
  routeChange: RouteChangeEventDetails | null,
) => {
  if (message?.kind === MessageType.BatmanOriginatorMessage || routeChange) {
    return "Originator Added";
  }

  return "Route Added";
};

const getRouteUpdateTitle = (
  message: Message | null,
  routeChange: RouteChangeEventDetails | null,
) => {
  if (message?.kind === MessageType.BatmanOriginatorMessage || routeChange) {
    return "Originator Updated";
  }

  return "Route Updated";
};

const getRouteRemoveTitle = (
  message: Message | null,
  routeChange: RouteChangeEventDetails | null,
) => {
  if (message?.kind === MessageType.BatmanOriginatorMessage || routeChange) {
    return "Originator Removed";
  }

  return "Route Removed";
};

const getRouteInsertDescription = () => {
  return (
    <>
      {"The node created a new originator-table entry."}{" "}
      {
        "The record was accepted from a valid OGMv2, and the node stored originator and sender context for this path."
      }
    </>
  );
};

const getRouteUpdateDescription = () => {
  return (
    <>
      {"The node refreshed an originator-table entry."}{" "}
      {
        "The update came from processing a valid OGMv2 for that originator, keeping sequence progress and last-seen timing fresh."
      }
    </>
  );
};

export const getRouteSequenceWindowExplanation = (event: Event) => {
  if (event.type !== EventType.AddRoute && event.type !== EventType.UpdateRoute) {
    return null;
  }

  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);
  const nextRoute = routeChange?.nextRoute;
  if (!routeChange || !nextRoute || message?.kind !== MessageType.BatmanOriginatorMessage) {
    return null;
  }

  return `Sequence Protection Window tracks accepted (message.sequence) numbers and blocks duplicates or out-of-range OGMs. The (message.sequence) number of received OGM: ${message.sequence}.`;
};

const getRouteRemoveDescription = (reason: string) => {
  return (
    <>
      {"The node removed an originator-table entry."} {"The route is no longer treated as valid"}.{" "}
      {
        "B.A.T.M.A.N. V drops this record when the route becomes stale, so this next hop is no longer trusted as a valid path to that originator."
      }{" "}
      {`Reason: ${reason}`}
    </>
  );
};

export const renderPeerName = (
  peerId: UUID,
  peerName: string,
  onPeerHoverChange: (peerId: UUID | null) => void,
): ReactNode => {
  return (
    <span
      className="simulation-panel__peer-name"
      onMouseEnter={() => onPeerHoverChange(peerId)}
      onMouseLeave={() => onPeerHoverChange(null)}
    >
      {peerName}
    </span>
  );
};

export const getPeerLabel = (peerId: UUID, peerNameById: Map<UUID, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};

const getPeerDisplayName = (peerId: UUID, peerNameById: Map<UUID, string>) => {
  return peerNameById.get(peerId) ?? "Unknown";
};

const isSourcePacketSendFailure = (event: Event, message: Message | null) => {
  if (event.type !== EventType.Drop) {
    return false;
  }

  const details = event.details as DropEventDetails;
  if (details.reasonCode === "NO_ROUTE" || details.reasonCode === "SOURCE_UNAVAILABLE") {
    return true;
  }

  return message?.kind === MessageType.Packet && message.sourcePeerId === null;
};
