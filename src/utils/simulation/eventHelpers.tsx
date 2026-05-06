import type { ReactNode } from "react";

import { ui } from "../../i18n/messages";
import { EntityType } from "../../types/enums";
import {
  type DroppedEventDetails,
  type EntityStatusChangedEventDetails,
  type PeerMovedEventDetails,
  type RouteSelectedEventDetails,
  SimulationMessageKind,
  SimulationEventType,
  type BatmanRouteRecord,
  type RoutingTableChangeDetails,
  type SimulationEvent,
  type SimulationMessage,
  type ThroughputCalculationEventDetails,
} from "../../types/simulation";

export const getEventTitle = (event: SimulationEvent) => {
  const message = getEventMessage(event);
  const routeChange = getRouteChange(event);

  switch (event.type) {
    case SimulationEventType.RoutingTableInsert:
      return getRouteInsertTitle(message, routeChange);
    case SimulationEventType.RoutingTableUpdate:
      return getRouteUpdateTitle(message, routeChange);
    case SimulationEventType.RoutingTableRemove:
      return getRouteRemoveTitle(message, routeChange);
    case SimulationEventType.SystemMessageBroadcast:
      return getBroadcastTitle(event, message);
    case SimulationEventType.SystemRouteSelected:
      return ui.simulation.routeSelected;
    case SimulationEventType.SystemThroughputCalculated:
      return ui.simulation.throughputRecalculated;
    case SimulationEventType.SystemMessageDropped:
      return getDroppedTitle(event, message);
    case SimulationEventType.SystemPeerMoved:
      return ui.simulation.peerMoved;
    case SimulationEventType.SystemEntityStatusChanged:
      return ui.simulation.entityStatusChanged;
    default:
      return ui.simulation.genericEvent;
  }
};

export const getSimulationReadMorePath = (
  event: SimulationEvent,
  message: SimulationMessage | null,
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

  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return "/docs/batman#echo-location-protocol";
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return "/docs/batman#originator-message";
  }

  if (
    hasRouteChange ||
    event.type === SimulationEventType.SystemRouteSelected ||
    event.type === SimulationEventType.RoutingTableInsert ||
    event.type === SimulationEventType.RoutingTableUpdate ||
    event.type === SimulationEventType.RoutingTableRemove
  ) {
    return "/docs/batman#route-selection";
  }

  return "/docs/batman#what-you-need-to-know";
};

export const getEventDescription = (event: SimulationEvent, peerNameById: Map<string, string>) => {
  const actor = ui.simulation.eventNodeLabel;
  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);

  if (routeChange) {
    if (event.type === SimulationEventType.RoutingTableInsert) {
      return getRouteInsertDescription();
    }

    if (event.type === SimulationEventType.RoutingTableUpdate) {
      return getRouteUpdateDescription();
    }

    return getRouteRemoveDescription(routeChange.reason);
  }

  switch (event.type) {
    case SimulationEventType.SystemMessageBroadcast:
      return getBroadcastDescription(event, message);
    case SimulationEventType.SystemRouteSelected: {
      const details = event.details as RouteSelectedEventDetails;
      return ui.simulation.eventRouteSelected(
        getPeerDisplayName(details.selectedRoute.originatorPeerId, peerNameById),
        getPeerDisplayName(details.selectedRoute.hopPeerId, peerNameById),
        details.selectedRoute.quality,
      );
    }
    case SimulationEventType.SystemThroughputCalculated:
      return getThroughputCalculatedDescription(actor, event);
    case SimulationEventType.SystemMessageDropped:
      return getDroppedDescription(actor, event, message);
    case SimulationEventType.SystemPeerMoved: {
      const details = event.details as PeerMovedEventDetails;
      return ui.simulation.eventPeerMoved(details.toX, details.toY);
    }
    case SimulationEventType.SystemEntityStatusChanged: {
      const details = event.details as EntityStatusChangedEventDetails;
      const entityLabel =
        details.entityType === EntityType.Link ? ui.entities.typeLink : ui.entities.typePeer;
      return ui.simulation.eventEntityStatusChanged(entityLabel, details.nextEnabled);
    }
    default:
      return ui.simulation.eventEmitted(actor);
  }
};

export const getRouteChange = (event: SimulationEvent): RoutingTableChangeDetails | null => {
  if (
    event.type !== SimulationEventType.RoutingTableInsert &&
    event.type !== SimulationEventType.RoutingTableUpdate &&
    event.type !== SimulationEventType.RoutingTableRemove
  ) {
    return null;
  }

  return event.details as RoutingTableChangeDetails;
};

export const getRouteRows = (details: RoutingTableChangeDetails): BatmanRouteRecord[] => {
  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

export const getSelectedRoute = (event: SimulationEvent): BatmanRouteRecord | null => {
  if (event.type !== SimulationEventType.SystemRouteSelected) {
    return null;
  }

  const details = event.details as RouteSelectedEventDetails;
  return details.selectedRoute;
};

export const getMessageSummary = (
  event: SimulationEvent,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
): Array<{ label: string; value: ReactNode }> | null => {
  const message = getEventMessage(event);
  if (!message) {
    return null;
  }

  if (event.type === SimulationEventType.SystemRouteSelected) {
    const details = event.details as RouteSelectedEventDetails;
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
          details.selectedRoute.hopPeerId,
          getPeerLabel(details.selectedRoute.hopPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: ui.simulation.tableTq,
        value: String(details.selectedRoute.quality),
      },
      {
        label: ui.simulation.tableLastSeen,
        value: String(details.selectedRoute.lastTick),
      },
    ];
  }

  if (message.kind === SimulationMessageKind.Packet) {
    return [
      {
        label: ui.simulation.summarySource,
        value: message.sourcePeerId
          ? renderPeerName(
              message.sourcePeerId,
              getPeerLabel(message.sourcePeerId, peerNameById),
              onPeerHoverChange,
            )
          : ui.common.unknown,
      },
      {
        label: ui.simulation.summaryDestination,
        value: renderPeerName(
          message.destinationPeerId,
          getPeerLabel(message.destinationPeerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: ui.simulation.summaryType,
        value: ui.simulation.summaryPacket,
      },
      {
        label: ui.simulation.summaryTtl,
        value: String(message.timeToLive),
      },
    ];
  }

  if (event.type === SimulationEventType.SystemPeerMoved) {
    const details = event.details as PeerMovedEventDetails;
    return [
      {
        label: ui.properties.fieldPeer,
        value: renderPeerName(
          details.peerId,
          getPeerLabel(details.peerId, peerNameById),
          onPeerHoverChange,
        ),
      },
      {
        label: ui.properties.fieldPosition,
        value: `(${details.toX}, ${details.toY})`,
      },
    ];
  }

  if (event.type === SimulationEventType.SystemEntityStatusChanged) {
    const details = event.details as EntityStatusChangedEventDetails;
    return [
      {
        label: ui.properties.fieldType,
        value: details.entityType === EntityType.Link ? ui.entities.typeLink : ui.entities.typePeer,
      },
      {
        label: ui.properties.fieldStatus,
        value: details.nextEnabled ? ui.common.enabled : ui.common.disabled,
      },
    ];
  }

  return null;
};

export const getEventMessage = (event: SimulationEvent): SimulationMessage | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as SimulationMessage;
};

const getBroadcastTitle = (event: SimulationEvent, message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return ui.simulation.elpBroadcast;
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return "retransmit" in event.details && event.details.retransmit
      ? ui.simulation.ogmBroadcastRetransmission
      : ui.simulation.ogmBroadcast;
  }

  if (message?.kind === SimulationMessageKind.Packet) {
    return ui.simulation.packetBroadcast;
  }

  return ui.simulation.broadcastMessage;
};

const getDroppedTitle = (event: SimulationEvent, message: SimulationMessage | null) => {
  if (isSourcePacketSendFailure(event, message)) {
    return ui.simulation.packetSendFailed;
  }

  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return ui.simulation.elpDropped;
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return ui.simulation.ogmDropped;
  }

  if (message?.kind === SimulationMessageKind.Packet) {
    return ui.simulation.packetDropped;
  }

  return ui.simulation.dropMessage;
};

const getBroadcastDescription = (event: SimulationEvent, message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return <>{ui.simulation.elpBroadcastBody()}</>;
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    if ("retransmit" in event.details && event.details.retransmit) {
      return <>{ui.simulation.ogmRebroadcastBodyNode}</>;
    }

    return <>{ui.simulation.ogmBroadcastBody}</>;
  }

  if (message?.kind === SimulationMessageKind.Packet) {
    return <>{ui.simulation.packetBroadcastBody}</>;
  }

  return <>{ui.simulation.broadcastUnknownBody}</>;
};

const getDroppedDescription = (
  actor: string,
  event: SimulationEvent,
  message: SimulationMessage | null,
) => {
  if (isSourcePacketSendFailure(event, message)) {
    const details = event.details as DroppedEventDetails;
    return <>{ui.simulation.packetSendFailedReason(details.reason)}</>;
  }

  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return <>{ui.simulation.droppedGeneric(actor)}</>;
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return <>{ui.simulation.droppedOgm(actor)}</>;
  }

  if (message?.kind === SimulationMessageKind.Packet) {
    return <>{ui.simulation.droppedPacket(actor)}</>;
  }

  return <>{ui.simulation.droppedGeneric(actor)}</>;
};

const getThroughputCalculatedDescription = (actor: string, event: SimulationEvent) => {
  const details = event.details as ThroughputCalculationEventDetails;
  if (details.message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return <>{ui.simulation.throughputOverview}</>;
  }

  if (details.message.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return <>{ui.simulation.ogmThroughputOperationTheory}</>;
  }

  return <>{ui.simulation.eventThroughputCalculated(actor, details.reason)}</>;
};

export const getThroughputBreakdown = (event: SimulationEvent) => {
  if (event.type !== SimulationEventType.SystemThroughputCalculated) {
    return null;
  }

  const details = event.details as ThroughputCalculationEventDetails;
  if (details.message.kind !== SimulationMessageKind.BatmanEchoLocationMessage) {
    return null;
  }

  return details.breakdown ?? null;
};

export const getOgmBroadcastThroughputExplanation = (
  event: SimulationEvent,
  message: SimulationMessage | null,
) => {
  if (event.type !== SimulationEventType.SystemMessageBroadcast) {
    return null;
  }

  if (message?.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
    return null;
  }

  if ("retransmit" in event.details && event.details.retransmit) {
    return null;
  }

  return ui.simulation.ogmThroughputAnswer;
};

export const getOgmThroughputSelectionExplanation = (event: SimulationEvent) => {
  if (event.type !== SimulationEventType.SystemThroughputCalculated) {
    return null;
  }

  const details = event.details as ThroughputCalculationEventDetails;
  if (details.message.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
    return null;
  }

  if (!details.ogmSelection) {
    return null;
  }

  const selection = details.ogmSelection;
  if (selection.isWirelessHop) {
    return ui.simulation.ogmThroughputSelectedWithPenalty(
      selection.receivedThroughput,
      selection.neighbourThroughput,
      selection.selectedThroughput,
      selection.hopPenaltyPercent,
      selection.forwardedThroughput,
    );
  }

  return ui.simulation.ogmThroughputSelectedWithoutPenalty(
    selection.receivedThroughput,
    selection.neighbourThroughput,
    selection.selectedThroughput,
    selection.forwardedThroughput,
  );
};

export const formatFixed = (value: number) => value.toFixed(2);

export const getThroughputBaseExplanation = (
  breakdown: NonNullable<ThroughputCalculationEventDetails["breakdown"]>,
) => {
  const cutAmount = Math.max(0, breakdown.baseReferenceThroughput - breakdown.baseThroughput);

  if (cutAmount > 0) {
    return ui.simulation.throughputBaseWithDistanceCut(
      Math.round(breakdown.baseThroughput),
      Math.round(breakdown.baseReferenceThroughput),
      formatFixed(breakdown.distance),
      Math.round(breakdown.distancePenaltyDistance),
      formatFixed(breakdown.distancePenaltyPercent),
      Math.round(cutAmount),
      formatFixed(breakdown.receptionRatio),
    );
  }

  return ui.simulation.throughputBaseWithoutDistanceCut(
    Math.round(breakdown.baseThroughput),
    formatFixed(breakdown.receptionRatio),
  );
};

export const getThroughputEwmaExplanation = (
  breakdown: NonNullable<ThroughputCalculationEventDetails["breakdown"]>,
) => {
  if (breakdown.previousEwma == null) {
    return ui.simulation.throughputEwmaInitial(formatFixed(breakdown.nextEwma));
  }

  return ui.simulation.throughputEwmaUpdated(
    formatFixed(breakdown.previousEwma),
    formatFixed(breakdown.rawThroughput),
    formatFixed(breakdown.nextEwma),
  );
};

const getRouteInsertTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return ui.simulation.updateOriginators;
  }

  return ui.simulation.routeAdded;
};

const getRouteUpdateTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return ui.simulation.updateOriginators;
  }

  return ui.simulation.routeUpdated;
};

const getRouteRemoveTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return ui.simulation.originatorRemoved;
  }

  return ui.simulation.routeRemoved;
};

const getRouteInsertDescription = () => {
  return (
    <>
      {ui.simulation.routeInsertBodyPrefix} {ui.simulation.routeInsertBodySuffix}
    </>
  );
};

const getRouteUpdateDescription = () => {
  return (
    <>
      {ui.simulation.routeUpdateBodyPrefix} {ui.simulation.routeUpdateBodySuffix}
    </>
  );
};

export const getRouteSequenceWindowExplanation = (event: SimulationEvent) => {
  if (
    event.type !== SimulationEventType.RoutingTableInsert &&
    event.type !== SimulationEventType.RoutingTableUpdate
  ) {
    return null;
  }

  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);
  const nextRoute = routeChange?.nextRoute;
  if (
    !routeChange ||
    !nextRoute ||
    message?.kind !== SimulationMessageKind.BatmanOriginatorMessage
  ) {
    return null;
  }

  return ui.simulation.sequenceWindowAnswer(message.sequence);
};

const getRouteRemoveDescription = (reason: string) => {
  return (
    <>
      {ui.simulation.routeRemoveBodyPrefix} {ui.simulation.routeRemoveBodyMiddle}.{" "}
      {ui.simulation.routeRemoveBodySuffix} {ui.simulation.routeRemoveReasonLabel(reason)}
    </>
  );
};

export const renderPeerName = (
  peerId: string,
  peerName: string,
  onPeerHoverChange: (peerId: string | null) => void,
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

export const getPeerLabel = (peerId: string, peerNameById: Map<string, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};

const getPeerDisplayName = (peerId: string, peerNameById: Map<string, string>) => {
  return peerNameById.get(peerId) ?? ui.common.unknown;
};

const isSourcePacketSendFailure = (event: SimulationEvent, message: SimulationMessage | null) => {
  if (event.type !== SimulationEventType.SystemMessageDropped) {
    return false;
  }

  const details = event.details as DroppedEventDetails;
  if (details.reasonCode === "NO_ROUTE" || details.reasonCode === "SOURCE_UNAVAILABLE") {
    return true;
  }

  return message?.kind === SimulationMessageKind.Packet && message.sourcePeerId === null;
};
