import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ui } from "../../i18n/messages";
import {
  SimulationMessageKind,
  SimulationEventType,
  type BatmanRouteRecord,
  type RoutingTableChangeDetails,
  type SimulationEvent,
  type SimulationMessage,
  type SimulationStepResult,
  type ThroughputCalculationEventDetails,
} from "../../types/simulation";

type SimulationPanelProps = {
  anchorX: number;
  anchorY: number;
  canGoNextEvent: boolean;
  canGoPrevEvent: boolean;
  currentEvent: SimulationEvent | null;
  currentEventIndex: number;
  currentEventsTotal: number;
  currentStepResult: SimulationStepResult | null;
  isTqDisclosureOpen: boolean;
  isSequenceDisclosureOpen: boolean;
  onPeerHoverChange: (peerId: string | null) => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
  onTqDisclosureToggle: (eventId: string) => void;
  onSequenceDisclosureToggle: (eventId: string) => void;
};

export default function SimulationPanel({
  anchorX,
  anchorY,
  canGoNextEvent,
  canGoPrevEvent,
  currentEvent,
  currentEventIndex,
  currentEventsTotal,
  currentStepResult,
  isTqDisclosureOpen,
  isSequenceDisclosureOpen,
  onPeerHoverChange,
  onNextEvent,
  onPrevEvent,
  onTqDisclosureToggle,
  onSequenceDisclosureToggle,
}: SimulationPanelProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      setDragOffset({
        x: dragState.startOffsetX + (event.clientX - dragState.startPointerX),
        y: dragState.startOffsetY + (event.clientY - dragState.startPointerY),
      });
    };

    const handlePointerEnd = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [isDragging]);

  if (!currentStepResult || !currentEvent) {
    return null;
  }

  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );
  const routeChange = getRouteChange(currentEvent);
  const currentMessage = getEventMessage(currentEvent);
  const title = getEventTitle(currentEvent);
  const description = getEventDescription(currentEvent);
  const eventOwner = renderPeerName(
    currentEvent.peerId,
    getPeerLabel(currentEvent.peerId, peerNameById),
    onPeerHoverChange,
  );
  const routeRows = routeChange ? getRouteRows(routeChange) : [];
  const ogmBroadcastThroughputExplanation = getOgmBroadcastThroughputExplanation(
    currentEvent,
    currentMessage,
  );
  const ogmThroughputSelectionExplanation = getOgmThroughputSelectionExplanation(currentEvent);
  const throughputBreakdown = getThroughputBreakdown(currentEvent);
  const routeSequenceWindowExplanation = routeChange
    ? getRouteSequenceWindowExplanation(currentEvent)
    : null;
  const messageSummary = routeChange
    ? null
    : getMessageSummary(currentEvent, peerNameById, onPeerHoverChange);
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };
  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startOffsetX: dragOffset.x,
      startOffsetY: dragOffset.y,
    };
    setIsDragging(true);
    event.stopPropagation();
    event.preventDefault();
  };
  const handleTqDisclosureToggle = () => {
    onTqDisclosureToggle(currentEvent.id);
  };
  const handleSequenceDisclosureToggle = () => {
    onSequenceDisclosureToggle(currentEvent.id);
  };

  return (
    <aside
      className={`simulation-panel simulation-panel--tooltip${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label={ui.simulation.panelAria}
      onPointerDown={handlePointerDown}
      onMouseLeave={() => onPeerHoverChange(null)}
      style={{ left: `${anchorX + dragOffset.x}px`, top: `${anchorY + dragOffset.y}px` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{title}</h2>
        <span className="simulation-panel__tick">{eventOwner}</span>
      </header>

      <section className="simulation-panel__section">
        <p className="simulation-panel__description">{description}</p>
        {routeChange ? (
          <div className="simulation-panel__table-block">
            <table className="simulation-panel__table-view">
              <thead>
                <tr>
                  <th>{ui.simulation.tableOriginator}</th>
                  <th>{ui.simulation.tableNextHop}</th>
                  <th>{ui.simulation.tableTq}</th>
                  <th>{ui.simulation.tableLastSeen}</th>
                </tr>
              </thead>
              <tbody>
                {routeRows.map((row, index) => (
                  <tr key={`${row.originatorPeerId}-${row.hopPeerId}-${index}`}>
                    <td>
                      {renderPeerName(
                        row.originatorPeerId,
                        getPeerLabel(row.originatorPeerId, peerNameById),
                        onPeerHoverChange,
                      )}
                    </td>
                    <td>
                      {renderPeerName(
                        row.hopPeerId,
                        getPeerLabel(row.hopPeerId, peerNameById),
                        onPeerHoverChange,
                      )}
                    </td>
                    <td>{row.quality}</td>
                    <td>{row.lastTick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {routeSequenceWindowExplanation ? (
              <div className="simulation-panel__tq-disclosure">
                <button
                  className="simulation-panel__tq-toggle"
                  type="button"
                  onClick={handleSequenceDisclosureToggle}
                  aria-expanded={isSequenceDisclosureOpen}
                >
                  <ChevronRight
                    size={12}
                    className={`simulation-panel__tq-toggle-icon${isSequenceDisclosureOpen ? " simulation-panel__tq-toggle-icon--open" : ""}`}
                  />
                  <span className="simulation-panel__tq-toggle-label">
                    {ui.simulation.sequenceWindowQuestion}
                  </span>
                </button>
                {isSequenceDisclosureOpen ? (
                  <p className="simulation-panel__description simulation-panel__description--secondary">
                    {routeSequenceWindowExplanation}
                  </p>
                ) : null}
              </div>
            ) : null}
            {isSequenceDisclosureOpen && routeSequenceWindowExplanation
              ? routeRows.map((row, index) => (
                  <div
                    className="simulation-panel__quality-window"
                    key={`window-${row.originatorPeerId}-${row.hopPeerId}-${index}`}
                  >
                    <p className="simulation-panel__quality-window-label">
                      {ui.simulation.qualityWindowTitle}
                    </p>
                    <div
                      className="simulation-panel__quality-window-bits"
                      aria-label={ui.simulation.qualityWindowBitsAria}
                    >
                      {row.qualityWindow.split("").map((bit, bitIndex) => (
                        <span
                          className={`simulation-panel__quality-window-bit${bit === "1" ? " simulation-panel__quality-window-bit--active" : ""}`}
                          key={`${row.originatorPeerId}-${row.hopPeerId}-${bitIndex}`}
                        >
                          {bit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              : null}
          </div>
        ) : messageSummary ? (
          <div className="simulation-panel__table-block">
            <table className="simulation-panel__table-view simulation-panel__table-view--message">
              <tbody>
                {messageSummary.map((item) => (
                  <tr key={item.label}>
                    <th scope="row">{item.label}</th>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {throughputBreakdown ? (
          <div className="simulation-panel__tq-disclosure">
            <button
              className="simulation-panel__tq-toggle"
              type="button"
              onClick={handleTqDisclosureToggle}
              aria-expanded={isTqDisclosureOpen}
            >
              <ChevronRight
                size={12}
                className={`simulation-panel__tq-toggle-icon${isTqDisclosureOpen ? " simulation-panel__tq-toggle-icon--open" : ""}`}
              />
              <span className="simulation-panel__tq-toggle-label">
                {ui.simulation.throughputHowCalculatedQuestion}
              </span>
            </button>
            {isTqDisclosureOpen ? (
              <div className="simulation-panel__table-block">
                <p className="simulation-panel__description simulation-panel__description--secondary">
                  {ui.simulation.throughputFormulaIntro}
                </p>
                <p className="simulation-panel__description simulation-panel__description--secondary simulation-panel__formula">
                  Throughput = Base Throughput x Reception Ratio
                </p>
                <p className="simulation-panel__description simulation-panel__description--secondary">
                  {getThroughputBaseExplanation(throughputBreakdown)}
                </p>
                <p className="simulation-panel__description simulation-panel__description--secondary simulation-panel__formula">
                  {ui.simulation.throughputEquation(
                    formatFixed(throughputBreakdown.baseThroughput),
                    formatFixed(throughputBreakdown.receptionRatio),
                    formatFixed(throughputBreakdown.rawThroughput),
                  )}
                </p>
                <p className="simulation-panel__description simulation-panel__description--secondary">
                  {getThroughputEwmaExplanation(throughputBreakdown)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        {ogmThroughputSelectionExplanation ? (
          <div className="simulation-panel__tq-disclosure">
            <button
              className="simulation-panel__tq-toggle"
              type="button"
              onClick={handleTqDisclosureToggle}
              aria-expanded={isTqDisclosureOpen}
            >
              <ChevronRight
                size={12}
                className={`simulation-panel__tq-toggle-icon${isTqDisclosureOpen ? " simulation-panel__tq-toggle-icon--open" : ""}`}
              />
              <span className="simulation-panel__tq-toggle-label">
                {ui.simulation.ogmThroughputSelectedQuestion}
              </span>
            </button>
            {isTqDisclosureOpen ? (
              <p className="simulation-panel__description simulation-panel__description--secondary">
                {ogmThroughputSelectionExplanation}
              </p>
            ) : null}
          </div>
        ) : null}
        {ogmBroadcastThroughputExplanation ? (
          <div className="simulation-panel__tq-disclosure">
            <button
              className="simulation-panel__tq-toggle"
              type="button"
              onClick={handleTqDisclosureToggle}
              aria-expanded={isTqDisclosureOpen}
            >
              <ChevronRight
                size={12}
                className={`simulation-panel__tq-toggle-icon${isTqDisclosureOpen ? " simulation-panel__tq-toggle-icon--open" : ""}`}
              />
              <span className="simulation-panel__tq-toggle-label">
                {ui.simulation.ogmThroughputQuestion}
              </span>
            </button>
            {isTqDisclosureOpen ? (
              <p className="simulation-panel__description simulation-panel__description--secondary">
                {ogmBroadcastThroughputExplanation}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="simulation-panel__footer">
        <button className="simulation-panel__read-more" type="button">
          <ExternalLink size={12} />
          {ui.simulation.packetStructureReadMore}
        </button>
        <div className="simulation-panel__pager simulation-panel__pager--footer">
          <button
            className="simulation-panel__pager-button"
            type="button"
            onClick={onPrevEvent}
            disabled={!canGoPrevEvent}
            aria-label={ui.simulation.previousEventAria}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="simulation-panel__pager-label">
            {currentEventsTotal === 0 ? "0/0" : `${currentEventIndex + 1}/${currentEventsTotal}`}
          </span>
          <button
            className="simulation-panel__pager-button"
            type="button"
            onClick={onNextEvent}
            disabled={!canGoNextEvent}
            aria-label={ui.simulation.nextEventAria}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </aside>
  );
}

const getEventTitle = (event: SimulationEvent) => {
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
    case SimulationEventType.SystemMessageSent:
      return ui.simulation.sendMessage;
    case SimulationEventType.SystemThroughputCalculated:
      return ui.simulation.throughputRecalculated;
    case SimulationEventType.SystemMessageDropped:
      return getDroppedTitle(message);
    default:
      return ui.simulation.genericEvent;
  }
};

const getEventDescription = (event: SimulationEvent) => {
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

    return getRouteRemoveDescription();
  }

  switch (event.type) {
    case SimulationEventType.SystemMessageBroadcast:
      return getBroadcastDescription(event, message);
    case SimulationEventType.SystemMessageSent:
      return ui.simulation.eventSent(actor);
    case SimulationEventType.SystemThroughputCalculated:
      return getThroughputCalculatedDescription(actor, event);
    case SimulationEventType.SystemMessageDropped:
      return getDroppedDescription(event.peerId, actor, message);
    default:
      return ui.simulation.eventEmitted(actor);
  }
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

const getRouteRows = (details: RoutingTableChangeDetails): BatmanRouteRecord[] => {
  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

const getMessageSummary = (
  event: SimulationEvent,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
): Array<{ label: string; value: ReactNode }> | null => {
  const message = getEventMessage(event);
  if (!message) {
    return null;
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

  return null;
};

const getEventMessage = (event: SimulationEvent): SimulationMessage | null => {
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

const getDroppedTitle = (message: SimulationMessage | null) => {
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
  _actorId: string,
  actor: string,
  message: SimulationMessage | null,
) => {
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

const getThroughputBreakdown = (event: SimulationEvent) => {
  if (event.type !== SimulationEventType.SystemThroughputCalculated) {
    return null;
  }

  const details = event.details as ThroughputCalculationEventDetails;
  if (details.message.kind !== SimulationMessageKind.BatmanEchoLocationMessage) {
    return null;
  }

  return details.breakdown ?? null;
};

const getOgmBroadcastThroughputExplanation = (
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

const getOgmThroughputSelectionExplanation = (event: SimulationEvent) => {
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

const formatFixed = (value: number) => value.toFixed(2);

const getThroughputBaseExplanation = (
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

const getThroughputEwmaExplanation = (
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

const getRouteSequenceWindowExplanation = (event: SimulationEvent) => {
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

const getRouteRemoveDescription = () => {
  return (
    <>
      {ui.simulation.routeRemoveBodyPrefix} {ui.simulation.routeRemoveBodyMiddle}.{" "}
      {ui.simulation.routeRemoveBodySuffix}
    </>
  );
};

const renderPeerName = (
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

const getPeerLabel = (peerId: string, peerNameById: Map<string, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};
