import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { ui } from "../../i18n/messages";
import { ToolbarMode } from "../../types/enums";
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

const BATMAN_V_HOP_PENALTY_PERCENT = 5.8;

type SimulationPanelProps = {
  anchorX: number;
  anchorY: number;
  canGoNextEvent: boolean;
  canGoPrevEvent: boolean;
  currentEvent: SimulationEvent | null;
  currentEventIndex: number;
  currentEventsTotal: number;
  currentStepResult: SimulationStepResult | null;
  inspectionMode: ToolbarMode;
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
  inspectionMode,
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
  const title = getEventTitle(currentEvent);
  const description = getEventDescription(
    currentEvent,
    inspectionMode,
    peerNameById,
    onPeerHoverChange,
  );
  const eventOwner = renderPeerName(
    currentEvent.peerId,
    getPeerLabel(currentEvent.peerId, peerNameById),
    onPeerHoverChange,
  );
  const routeRows = routeChange ? getRouteRows(routeChange) : [];
  const routeTqExplanation = routeChange ? getRouteTqExplanation(currentEvent) : null;
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
            {routeTqExplanation ? (
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
                    {ui.simulation.tqQuestionWhat}
                  </span>
                </button>
                {isTqDisclosureOpen ? (
                  <p className="simulation-panel__description simulation-panel__description--secondary">
                    {routeTqExplanation}
                  </p>
                ) : null}
              </div>
            ) : null}
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

const getEventDescription = (
  event: SimulationEvent,
  inspectionMode: ToolbarMode,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const actor = getPeerLabel(event.peerId, peerNameById);
  const routeChange = getRouteChange(event);
  const message = getEventMessage(event);

  if (routeChange) {
    if (event.type === SimulationEventType.RoutingTableInsert) {
      return getRouteInsertDescription(
        event.peerId,
        actor,
        routeChange,
        message,
        peerNameById,
        onPeerHoverChange,
      );
    }

    if (event.type === SimulationEventType.RoutingTableUpdate) {
      return getRouteUpdateDescription(
        event.peerId,
        actor,
        routeChange,
        message,
        peerNameById,
        onPeerHoverChange,
      );
    }

    return getRouteRemoveDescription(
      event.peerId,
      actor,
      routeChange,
      message,
      peerNameById,
      onPeerHoverChange,
    );
  }

  if (inspectionMode === ToolbarMode.PacketStructure) {
    switch (event.type) {
      case SimulationEventType.SystemMessageBroadcast:
        return getBroadcastDescription(
          event.peerId,
          actor,
          event,
          message,
          peerNameById,
          onPeerHoverChange,
        );
      case SimulationEventType.SystemMessageSent:
        return ui.simulation.eventSent(actor);
      case SimulationEventType.SystemThroughputCalculated:
        return getThroughputCalculatedDescription(actor, event);
      case SimulationEventType.SystemMessageDropped:
        return getDroppedDescription(event.peerId, actor, message);
      default:
        return ui.simulation.eventEmitted(actor);
    }
  }

  return ui.simulation.routingStateChanged(actor);
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

const getBroadcastDescription = (
  actorId: string,
  actor: string,
  event: SimulationEvent,
  message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return <>{ui.simulation.broadcastFallback(actor)}</>;
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    const originator = getPeerLabel(message.sourcePeerId, peerNameById);
    const sender = getPeerLabel(message.senderPeerId, peerNameById);
    if ("retransmit" in event.details && event.details.retransmit) {
      return (
        <>
          {renderPeerName(actorId, actor, onPeerHoverChange)} {ui.simulation.ogmRebroadcastPrefix}{" "}
          {renderPeerName(message.sourcePeerId, originator, onPeerHoverChange)}
          {ui.simulation.ogmRebroadcastMiddle}
          {renderPeerName(message.senderPeerId, sender, onPeerHoverChange)}
          {ui.simulation.ogmRebroadcastSuffix}
        </>
      );
    }

    return (
      <>
        {ui.simulation.ogmBroadcastPrefix} {renderPeerName(actorId, actor, onPeerHoverChange)}{" "}
        {ui.simulation.ogmBroadcastMiddle}{" "}
        {renderPeerName(message.sourcePeerId, originator, onPeerHoverChange)}
        {ui.simulation.ogmBroadcastSuffix}
      </>
    );
  }

  return <>{ui.simulation.broadcastFallback(actor)}</>;
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
  return <>{ui.simulation.eventThroughputCalculated(actor, details.reason)}</>;
};

const getRouteInsertTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return ui.simulation.originatorAdded;
  }

  return ui.simulation.routeAdded;
};

const getRouteUpdateTitle = (
  message: SimulationMessage | null,
  routeChange: RoutingTableChangeDetails | null,
) => {
  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage || routeChange) {
    return ui.simulation.originatorUpdated;
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

const getRouteInsertDescription = (
  actorId: string,
  actor: string,
  routeChange: RoutingTableChangeDetails,
  _message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
  const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} {ui.simulation.routeInsertBodyPrefix}{" "}
      {renderPeerName(routeChange.originatorPeerId, originator, onPeerHoverChange)}{" "}
      {ui.simulation.routeInsertBodyMiddle}{" "}
      {renderPeerName(routeChange.hopPeerId, nextHop, onPeerHoverChange)}{" "}
      {ui.simulation.routeInsertBodySuffix} {routeChange.reason}
    </>
  );
};

const getRouteUpdateDescription = (
  actorId: string,
  actor: string,
  routeChange: RoutingTableChangeDetails,
  _message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
  const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} {ui.simulation.routeUpdateBodyPrefix}{" "}
      {renderPeerName(routeChange.originatorPeerId, originator, onPeerHoverChange)}{" "}
      {ui.simulation.routeUpdateBodyMiddle}{" "}
      {renderPeerName(routeChange.hopPeerId, nextHop, onPeerHoverChange)}{" "}
      {ui.simulation.routeUpdateBodySuffix} {routeChange.reason}
    </>
  );
};

const getRouteTqExplanation = (event: SimulationEvent) => {
  const routeChange = getRouteChange(event);
  if (!routeChange) {
    return null;
  }

  const message = getEventMessage(event);

  if (event.type === SimulationEventType.RoutingTableInsert) {
    const nextRoute = routeChange.nextRoute;
    if (!nextRoute || message?.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
      return ui.simulation.tqInsertFallback;
    }

    return ui.simulation.throughputAnswer(
      clampThroughput(message.throughput),
      applyHopPenalty(clampThroughput(message.throughput)),
    );
  }

  if (event.type === SimulationEventType.RoutingTableUpdate) {
    const previousRoute = routeChange.previousRoute;
    const nextRoute = routeChange.nextRoute;

    if (!previousRoute || !nextRoute) {
      return null;
    }

    const isDecayUpdate = routeChange.reason.includes(ui.runtime.qualityWindowShiftedNoOgm);

    if (!isDecayUpdate) {
      if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
        return ui.simulation.throughputAnswer(
          clampThroughput(message.throughput),
          applyHopPenalty(clampThroughput(message.throughput)),
        );
      }

      return ui.simulation.tqUpdateGeneric(
        countQualityWindowOnes(previousRoute.qualityWindow),
        previousRoute.quality,
        countQualityWindowOnes(nextRoute.qualityWindow),
        nextRoute.quality,
      );
    }

    return ui.simulation.tqDecayUpdate(
      countQualityWindowOnes(previousRoute.qualityWindow),
      previousRoute.quality,
      countQualityWindowOnes(nextRoute.qualityWindow),
      nextRoute.quality,
    );
  }

  return null;
};

const countQualityWindowOnes = (qualityWindow: string) => {
  return qualityWindow.split("").reduce((count, bit) => count + Number(bit === "1"), 0);
};

const getRouteSequenceWindowExplanation = (event: SimulationEvent) => {
  if (event.type !== SimulationEventType.RoutingTableUpdate) {
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

const getRouteRemoveDescription = (
  actorId: string,
  actor: string,
  routeChange: RoutingTableChangeDetails,
  _message: SimulationMessage | null,
  peerNameById: Map<string, string>,
  onPeerHoverChange: (peerId: string | null) => void,
) => {
  const originator = getPeerLabel(routeChange.originatorPeerId, peerNameById);
  const nextHop = getPeerLabel(routeChange.hopPeerId, peerNameById);

  return (
    <>
      {renderPeerName(actorId, actor, onPeerHoverChange)} {ui.simulation.routeRemoveBodyPrefix}{" "}
      {renderPeerName(routeChange.originatorPeerId, originator, onPeerHoverChange)}{" "}
      {ui.simulation.routeRemoveBodyMiddle}{" "}
      {renderPeerName(routeChange.hopPeerId, nextHop, onPeerHoverChange)}.{" "}
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

const clampThroughput = (throughput: number) => {
  if (!Number.isFinite(throughput)) {
    return 255;
  }

  return Math.max(0, Math.min(255, Math.floor(throughput)));
};

const applyHopPenalty = (throughput: number) => {
  const penalized = throughput * ((100 - BATMAN_V_HOP_PENALTY_PERCENT) / 100);
  return Math.max(0, Math.floor(penalized));
};
