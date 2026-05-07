import { ExternalLink, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { ui } from "../../i18n/messages";
import { RoutingProtocol } from "../../types/enums";
import type { SimulationStepResult } from "../../types/simulation";
import type { UUID } from "../../types/uuid";

type TableInspectionWindowProps = {
  isOpen: boolean;
  currentStepResult: SimulationStepResult | null;
  currentEventId: UUID | null;
  inspectedPeerId: UUID | null;
  onClose: () => void;
  onPeerHoverChange: (peerId: UUID | null) => void;
};

export default function TableInspectionWindow({
  isOpen,
  currentStepResult,
  currentEventId,
  inspectedPeerId,
  onClose,
  onPeerHoverChange,
}: TableInspectionWindowProps) {
  // Drag state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
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

  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
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

  const handlePanelPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  if (!isOpen || !currentStepResult || !inspectedPeerId) {
    return null;
  }

  const eventIndex = currentEventId
    ? currentStepResult.events.findIndex((event) => event.id === currentEventId)
    : -1;
  const snapshotForEvent =
    eventIndex >= 0 ? (currentStepResult.eventSnapshots[eventIndex] ?? null) : null;
  const inspectedSnapshot = snapshotForEvent ?? currentStepResult.snapshot;

  const peerNameById = new Map(inspectedSnapshot.peers.map((peer) => [peer.id, peer.name]));
  const inspectedPeer = inspectedSnapshot.peers.find((peer) => peer.id === inspectedPeerId);

  if (!inspectedPeer) {
    return null;
  }

  const selectedProtocol = inspectedPeer.protocols[0] ?? null;

  return (
    <aside
      className={`simulation-panel simulation-panel--inspector${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label={ui.simulation.panelAria}
      onPointerDown={handlePanelPointerDown}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header
        className="simulation-panel__header simulation-panel__header--draggable"
        onPointerDown={handleHeaderPointerDown}
      >
        <h2 className="simulation-panel__title">
          {selectedProtocol === RoutingProtocol.DSDV
            ? ui.simulation.tableInspectionTitleDsdv(inspectedPeer.name)
            : ui.simulation.tableInspectionTitle(inspectedPeer.name)}
        </h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={ui.packet.closeAria}
        >
          <X size={14} />
        </button>
      </header>

      <section className="simulation-panel__section" onMouseLeave={() => onPeerHoverChange(null)}>
        {selectedProtocol === RoutingProtocol.BATMAN ? (
          <>
            <div className="simulation-panel__table-block">
              <p className="simulation-panel__section-title">{ui.simulation.tableNeighbours}</p>
              <table className="simulation-panel__table-view">
                <thead>
                  <tr>
                    <th>{ui.simulation.tableNeighbour}</th>
                    <th>{ui.simulation.tableTq}</th>
                    <th>{ui.simulation.tableLastSeen}</th>
                    <th>{ui.simulation.summaryInterval}</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedPeer.batmanNeighboursTable.length === 0 ? (
                    <tr>
                      <td colSpan={4}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.batmanNeighboursTable.map((row, index) => (
                      <tr key={`${row.neighbourPeerId}-${index}`}>
                        <td>
                          {renderPeerName(
                            row.neighbourPeerId,
                            getPeerLabel(row.neighbourPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>{row.quality}</td>
                        <td>{row.lastTick}</td>
                        <td>{row.interval}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="simulation-panel__table-block">
              <p className="simulation-panel__section-title">{ui.simulation.tableOriginators}</p>
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
                  {inspectedPeer.batmanRoutingTable.length === 0 ? (
                    <tr>
                      <td colSpan={4}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.batmanRoutingTable.map((row, index) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : selectedProtocol === RoutingProtocol.DSDV ? (
          <div className="simulation-panel__table-block">
            <p className="simulation-panel__section-title">{ui.simulation.tableDsdvRoutes}</p>
            <table className="simulation-panel__table-view">
              <thead>
                <tr>
                  <th>{ui.simulation.tableDestination}</th>
                  <th>{ui.simulation.tableNextHop}</th>
                  <th>{ui.simulation.tableMetric}</th>
                  <th>{ui.simulation.tableSequence}</th>
                  <th>{ui.simulation.tableInstalled}</th>
                </tr>
              </thead>
              <tbody>
                {inspectedPeer.dsdvRoutingTable.length === 0 ? (
                  <tr>
                    <td colSpan={5}>{ui.simulation.tableNoRecords}</td>
                  </tr>
                ) : (
                  inspectedPeer.dsdvRoutingTable.map((row, index) => (
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
                      <td>{row.lastUpdateTick}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <footer className="simulation-panel__footer">
        <a
          className="simulation-panel__read-more"
          href={
            selectedProtocol === RoutingProtocol.DSDV
              ? "/docs/dsdv#routing-maintenance"
              : "/docs/batman#route-selection"
          }
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} />
          {ui.simulation.packetStructureReadMore}
        </a>
      </footer>
    </aside>
  );
}

const renderPeerName = (
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

const getPeerLabel = (peerId: UUID, peerNameById: Map<UUID, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};
