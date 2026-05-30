import {
  type BatmanCalculationEventDetails,
  type BatmanRouteChangeEventDetails,
  type BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman";
import {
  DropReason,
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

  if (message?.type === MessageType.BatmanEchoLocationMessage) {
    return "/docs/batman#echo-location-protocol";
  }

  if (message?.type === MessageType.BatmanOriginatorMessage) {
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

export const getRouteRows = (details: BatmanRouteChangeEventDetails): BatmanRouteRecord[] => {
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
          details.selectedRoute.hopId,
          getPeerLabel(details.selectedRoute.hopId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: "Throughput",
        value: String(details.selectedRoute.throughput),
      },
      {
        label: "Last Seen",
        value: String(details.selectedRoute.lastTick),
      },
    ];
  }

  if (message.type === MessageType.Packet) {
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
  if (message?.type === MessageType.BatmanEchoLocationMessage) {
    return "ELP Broadcast";
  }

  if (message?.type === MessageType.BatmanOriginatorMessage) {
    return "retransmit" in event.details && event.details.retransmit
      ? "OGMv2 Broadcast Retransmission"
      : "OGMv2 Broadcast";
  }

  if (message?.type === MessageType.Packet) {
    return "Packet Broadcast";
  }

  return "Broadcast Message";
};

const getDroppedTitle = (event: Event, message: Message | null) => {
  if (isSourcePacketSendFailure(event, message)) {
    return "Packet Send Failed";
  }

  if (message?.type === MessageType.BatmanEchoLocationMessage) {
    return "ELP Dropped";
  }

  if (message?.type === MessageType.BatmanOriginatorMessage) {
    return "OGMv2 Dropped";
  }

  if (message?.type === MessageType.Packet) {
    return "Packet Dropped";
  }

  return "Drop Message";
};

export const getThroughputBreakdown = (event: Event) => {
  if (event.type !== EventType.Calculation) {
    return null;
  }

  const details = event.details as BatmanCalculationEventDetails;
  if (details.message.type !== MessageType.BatmanEchoLocationMessage) {
    return null;
  }

  return details.elpProcessing ?? null;
};

export const getOgmBroadcastThroughputExplanation = (event: Event, message: Message | null) => {
  if (event.type !== EventType.Broadcast) {
    return null;
  }

  if (message?.type !== MessageType.BatmanOriginatorMessage) {
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
  if (details.message.type !== MessageType.BatmanOriginatorMessage) {
    return null;
  }

  if (!details.ogmProcessing) {
    return null;
  }

  const selection = details.ogmProcessing;
  if (selection.isWirelessHop) {
    return `The received value of throughput from OGMv2 was ${selection.receivedThroughput}, and value from Neighbours Table was ${selection.neighbourThroughput}, so minimum selected value was ${selection.selectedThroughput}. Because this is a wireless hop, peer penalty ${selection.hopPenaltyPercent.toFixed(1)}% was applied, producing finalized value ${selection.forwardedThroughput}. Final value is ${selection.forwardedThroughput}, and this value will be used as route throughput.`;
  }

  return `The received value of throughput from OGMv2 was ${selection.receivedThroughput}, and value from Neighbours Table was ${selection.neighbourThroughput}, so minimum selected value was ${selection.selectedThroughput}. This is a static hop, so no wireless peer penalty is applied. Final value is ${selection.forwardedThroughput}, and this value will be used as route throughput.`;
};

export const formatFixed = (value: number) => value.toFixed(2);

export const getThroughputBaseExplanation = (
  breakdown: NonNullable<BatmanCalculationEventDetails["elpProcessing"]>,
) => {
  const cutAmount = Math.max(0, breakdown.linkThroughput - breakdown.newThroughput);
  const receptionRatio =
    breakdown.linkThroughput > 0 ? breakdown.receptionedThroughput / breakdown.linkThroughput : 0;

  if (cutAmount > 0) {
    return `The throughput sample is ${Math.round(breakdown.newThroughput)}. Starting from ${Math.round(breakdown.linkThroughput)}, distance penalty was applied for link distance ${formatFixed(breakdown.distance)} (configured penalty distance ${Math.round(breakdown.penaltyDistance)}, penalty ${formatFixed(breakdown.penaltyPercent)}% per unit), reducing throughput by ${Math.round(cutAmount)}. The reception ratio is ${formatFixed(receptionRatio)} for this sample.`;
  }

  return `The throughput sample is ${Math.round(breakdown.newThroughput)}, and no distance cut is applied on this link. The reception ratio is ${formatFixed(receptionRatio)}.`;
};

export const getThroughputEwmaExplanation = (
  breakdown: NonNullable<BatmanCalculationEventDetails["elpProcessing"]>,
) => {
  if (breakdown.previousThroughput == null) {
    return `This value is then used as the initial input to the EWMA (Exponentially Weighted Moving Average), resulting in an initial smoothed metric of ${formatFixed(breakdown.smoothedThroughput)}, which will be refined over time as more measurements are collected.`;
  }

  return `This value is then folded into EWMA smoothing (alpha 0.20): (formatFixed(breakdown.previousEwma)) metric ${formatFixed(breakdown.previousThroughput)}, new sample ${formatFixed(breakdown.receptionedThroughput)}, resulting smoothed metric ${formatFixed(breakdown.smoothedThroughput)}.`;
};

const getRouteInsertTitle = (
  message: Message | null,
  routeChange: RouteChangeEventDetails | null,
) => {
  if (message?.type === MessageType.BatmanOriginatorMessage || routeChange) {
    return "Originator Added";
  }

  return "Route Added";
};

const getRouteUpdateTitle = (
  message: Message | null,
  routeChange: RouteChangeEventDetails | null,
) => {
  if (message?.type === MessageType.BatmanOriginatorMessage || routeChange) {
    return "Originator Updated";
  }

  return "Route Updated";
};

const getRouteRemoveTitle = (
  message: Message | null,
  routeChange: RouteChangeEventDetails | null,
) => {
  if (message?.type === MessageType.BatmanOriginatorMessage || routeChange) {
    return "Originator Removed";
  }

  return "Route Removed";
};

export const getRouteSequenceWindowExplanation = (event: Event) => {
  if (event.type !== EventType.AddRoute && event.type !== EventType.UpdateRoute) {
    return null;
  }

  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);
  const nextRoute = routeChange?.nextRoute;
  if (!routeChange || !nextRoute || message?.type !== MessageType.BatmanOriginatorMessage) {
    return null;
  }

  return `Sequence Protection Window tracks accepted (message.sequence) numbers and blocks duplicates or out-of-range OGMs. The (message.sequence) number of received OGM: ${message.sequence}.`;
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

const isSourcePacketSendFailure = (event: Event, message: Message | null) => {
  if (event.type !== EventType.Drop) {
    return false;
  }

  const details = event.details as DropEventDetails;
  if (
    details.reason === DropReason.NoRoute ||
    details.reason === DropReason.DestinationUnavailable
  ) {
    return true;
  }

  return message?.type === MessageType.Packet && message.sourcePeerId === null;
};
