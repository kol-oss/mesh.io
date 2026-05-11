import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";

import { ui } from "../../i18n/messages";
import {
  QualityWindowBit,
  type SimulationEvent,
  type SimulationStepResult,
} from "../../types/simulation";
import type { UUID } from "../../types/uuid";
import {
  formatFixed,
  getEventDescription,
  getEventMessage,
  getEventTitle,
  getMessageSummary,
  getOgmBroadcastThroughputExplanation,
  getOgmThroughputSelectionExplanation,
  getPeerLabel,
  getRouteChange,
  getRouteRows,
  getRouteSequenceWindowExplanation,
  getSelectedRoute,
  isBatmanRouteRecord,
  getSimulationReadMorePath,
  getThroughputBaseExplanation,
  getThroughputBreakdown,
  getThroughputEwmaExplanation,
  renderPeerName,
} from "../../utils/simulation/eventPresentation";

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
  onPeerHoverChange: (peerId: UUID | null) => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
  onTqDisclosureToggle: (eventId: UUID) => void;
  onSequenceDisclosureToggle: (eventId: UUID) => void;
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
  const selectedRoute = getSelectedRoute(currentEvent);
  const currentMessage = getEventMessage(currentEvent);
  const title = getEventTitle(currentEvent);
  const description = getEventDescription(currentEvent, peerNameById);
  const eventOwner = peerNameById.has(currentEvent.peerId)
    ? renderPeerName(
        currentEvent.peerId,
        getPeerLabel(currentEvent.peerId, peerNameById),
        onPeerHoverChange,
      )
    : currentEvent.peerId;
  const routeRows = routeChange ? getRouteRows(routeChange) : selectedRoute ? [selectedRoute] : [];
  const ogmBroadcastThroughputExplanation = getOgmBroadcastThroughputExplanation(
    currentEvent,
    currentMessage,
  );
  const ogmThroughputSelectionExplanation = getOgmThroughputSelectionExplanation(currentEvent);
  const throughputBreakdown = getThroughputBreakdown(currentEvent);
  const routeSequenceWindowExplanation = routeChange
    ? getRouteSequenceWindowExplanation(currentEvent)
    : null;
  const messageSummary =
    routeRows.length > 0 ? null : getMessageSummary(currentEvent, peerNameById, onPeerHoverChange);
  const readMorePath = getSimulationReadMorePath(
    currentEvent,
    currentMessage,
    routeChange !== null,
    throughputBreakdown !== null,
    routeSequenceWindowExplanation !== null,
  );

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
        {routeRows.length > 0 ? (
          <div className="simulation-panel__table-block">
            <table className="simulation-panel__table-view">
              <thead>
                {isBatmanRouteRecord(routeRows[0]) ? (
                  <tr>
                    <th>{ui.simulation.tableOriginator}</th>
                    <th>{ui.simulation.tableNextHop}</th>
                    <th>{ui.simulation.tableTq}</th>
                    <th>{ui.simulation.tableLastSeen}</th>
                  </tr>
                ) : (
                  <tr>
                    <th>{ui.simulation.tableDestination}</th>
                    <th>{ui.simulation.tableNextHop}</th>
                    <th>{ui.simulation.tableMetric}</th>
                    <th>{ui.simulation.tableSequence}</th>
                    {"pathPeerIds" in routeRows[0] ? <th>{ui.simulation.tablePath}</th> : null}
                    <th>{ui.simulation.tableInstalled}</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {routeRows.map((row, index) =>
                  isBatmanRouteRecord(row) ? (
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
                  ) : (
                    <tr key={`${row.destinationPeerId}-${row.nextHopPeerId}-${index}`}>
                      <td>
                        {renderPeerName(
                          row.destinationPeerId,
                          getPeerLabel(row.destinationPeerId, peerNameById),
                          onPeerHoverChange,
                        )}
                      </td>
                      <td>
                        {renderPeerName(
                          row.nextHopPeerId,
                          getPeerLabel(row.nextHopPeerId, peerNameById),
                          onPeerHoverChange,
                        )}
                      </td>
                      <td>{row.metric}</td>
                      <td>{row.sequenceNumber}</td>
                      {"pathPeerIds" in row && Array.isArray(row.pathPeerIds) ? (
                        <td>
                          {(row.pathPeerIds as UUID[])
                            .map((peerId) => getPeerLabel(peerId, peerNameById))
                            .join(" -> ")}
                        </td>
                      ) : null}
                      <td>{row.lastUpdateTick}</td>
                    </tr>
                  ),
                )}
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
            {isSequenceDisclosureOpen &&
            routeSequenceWindowExplanation &&
            isBatmanRouteRecord(routeRows[0])
              ? routeRows.filter(isBatmanRouteRecord).map((row, index) => (
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
                          className={`simulation-panel__quality-window-bit${bit === QualityWindowBit.Active ? " simulation-panel__quality-window-bit--active" : ""}`}
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
        <Link
          className="simulation-panel__read-more"
          to={readMorePath}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} />
          {ui.simulation.packetStructureReadMore}
        </Link>
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
