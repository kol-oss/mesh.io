import { ChevronRight, ExternalLink, X } from "lucide-react";
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
  const [collapsedSections, setCollapsedSections] = useState({
    batmanNeighbours: false,
    batmanOriginators: true,
    dsdvRoutes: false,
    dsrRoutes: false,
    neighbours: false,
    twoHop: true,
    selectors: true,
    topology: true,
    routes: true,
  });
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

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const renderCollapsibleBlock = (
    section: keyof typeof collapsedSections,
    title: string,
    table: ReactNode,
  ) => {
    const isOpen = !collapsedSections[section];

    return (
      <div className="simulation-panel__table-block">
        <div className="simulation-panel__tq-disclosure">
          <button
            className="simulation-panel__tq-toggle"
            type="button"
            onClick={() => toggleSection(section)}
            aria-expanded={isOpen}
          >
            <ChevronRight
              size={12}
              className={`simulation-panel__tq-toggle-icon${isOpen ? " simulation-panel__tq-toggle-icon--open" : ""}`}
            />
            <span className="simulation-panel__tq-toggle-label">{title}</span>
          </button>
        </div>
        {isOpen ? table : null}
      </div>
    );
  };

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
            : selectedProtocol === RoutingProtocol.DSR
              ? ui.simulation.tableInspectionTitleDsr(inspectedPeer.name)
              : selectedProtocol === RoutingProtocol.OLSR
                ? ui.simulation.tableInspectionTitleOlsr(inspectedPeer.name)
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
            {renderCollapsibleBlock(
              "batmanNeighbours",
              ui.simulation.tableNeighbours,
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
              </table>,
            )}

            {renderCollapsibleBlock(
              "batmanOriginators",
              ui.simulation.tableOriginators,
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
              </table>,
            )}
          </>
        ) : selectedProtocol === RoutingProtocol.DSDV ? (
          renderCollapsibleBlock(
            "dsdvRoutes",
            ui.simulation.tableDsdvRoutes,
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
            </table>,
          )
        ) : selectedProtocol === RoutingProtocol.DSR ? (
          renderCollapsibleBlock(
            "dsrRoutes",
            ui.simulation.tableDsrRoutes,
            <table className="simulation-panel__table-view">
              <thead>
                <tr>
                  <th>{ui.simulation.tableDestination}</th>
                  <th>{ui.simulation.tableNextHop}</th>
                  <th>{ui.simulation.tableMetric}</th>
                  <th>{ui.simulation.tableSequence}</th>
                  <th>{ui.simulation.tablePath}</th>
                  <th>{ui.simulation.tableInstalled}</th>
                </tr>
              </thead>
              <tbody>
                {inspectedPeer.dsrRoutingTable.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{ui.simulation.tableNoRecords}</td>
                  </tr>
                ) : (
                  inspectedPeer.dsrRoutingTable.map((row, index) => (
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
                      <td>
                        {row.pathPeerIds
                          .map((peerId) => getPeerLabel(peerId, peerNameById))
                          .join(" -> ")}
                      </td>
                      <td>{row.lastUpdateTick}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>,
          )
        ) : selectedProtocol === RoutingProtocol.OLSR ? (
          <>
            {renderCollapsibleBlock(
              "neighbours",
              ui.simulation.tableOlsrNeighbours,
              <table className="simulation-panel__table-view">
                <thead>
                  <tr>
                    <th>{ui.simulation.tableNeighbour}</th>
                    <th>{ui.simulation.tableNeighbourStatus}</th>
                    <th>{ui.simulation.tableLastSeen}</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedPeer.olsrNeighbourTable.length === 0 ? (
                    <tr>
                      <td colSpan={3}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.olsrNeighbourTable.map((row, index) => (
                      <tr key={`${row.neighbourPeerId}-${index}`}>
                        <td>
                          {renderPeerName(
                            row.neighbourPeerId,
                            getPeerLabel(row.neighbourPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>{row.status}</td>
                        <td>{row.lastUpdateTick}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>,
            )}

            {renderCollapsibleBlock(
              "twoHop",
              ui.simulation.tableOlsrTwoHop,
              <table className="simulation-panel__table-view">
                <thead>
                  <tr>
                    <th>{ui.simulation.tableDestination}</th>
                    <th>{ui.simulation.tableVia}</th>
                    <th>{ui.simulation.tableInstalled}</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedPeer.olsrTwoHopTable.length === 0 ? (
                    <tr>
                      <td colSpan={3}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.olsrTwoHopTable.map((row, index) => (
                      <tr key={`${row.destinationPeerId}-${row.viaPeerId}-${index}`}>
                        <td>
                          {renderPeerName(
                            row.destinationPeerId,
                            getPeerLabel(row.destinationPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>
                          {renderPeerName(
                            row.viaPeerId,
                            getPeerLabel(row.viaPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>{row.lastUpdateTick}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>,
            )}

            {renderCollapsibleBlock(
              "selectors",
              ui.simulation.tableOlsrSelectors,
              <table className="simulation-panel__table-view">
                <thead>
                  <tr>
                    <th>{ui.simulation.tableSelector}</th>
                    <th>{ui.simulation.tableInstalled}</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedPeer.olsrSelectorTable.length === 0 ? (
                    <tr>
                      <td colSpan={2}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.olsrSelectorTable.map((row, index) => (
                      <tr key={`${row.selectorPeerId}-${index}`}>
                        <td>
                          {renderPeerName(
                            row.selectorPeerId,
                            getPeerLabel(row.selectorPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>{row.lastUpdateTick}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>,
            )}

            {renderCollapsibleBlock(
              "topology",
              ui.simulation.tableOlsrTopology,
              <table className="simulation-panel__table-view">
                <thead>
                  <tr>
                    <th>{ui.simulation.tableDestination}</th>
                    <th>{ui.simulation.tableLastHop}</th>
                    <th>{ui.simulation.tableAnsn}</th>
                    <th>{ui.simulation.tableInstalled}</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedPeer.olsrTopologyTable.length === 0 ? (
                    <tr>
                      <td colSpan={4}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.olsrTopologyTable.map((row, index) => (
                      <tr key={`${row.destinationPeerId}-${row.lastHopPeerId}-${index}`}>
                        <td>
                          {renderPeerName(
                            row.destinationPeerId,
                            getPeerLabel(row.destinationPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>
                          {renderPeerName(
                            row.lastHopPeerId,
                            getPeerLabel(row.lastHopPeerId, peerNameById),
                            onPeerHoverChange,
                          )}
                        </td>
                        <td>{row.sequenceNumber}</td>
                        <td>{row.lastUpdateTick}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>,
            )}

            {renderCollapsibleBlock(
              "routes",
              ui.simulation.tableOlsrRoutes,
              <table className="simulation-panel__table-view">
                <thead>
                  <tr>
                    <th>{ui.simulation.tableDestination}</th>
                    <th>{ui.simulation.tableNextHop}</th>
                    <th>{ui.simulation.tableMetric}</th>
                    <th>{ui.simulation.tableAnsn}</th>
                    <th>{ui.simulation.tableInstalled}</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectedPeer.olsrRoutingTable.length === 0 ? (
                    <tr>
                      <td colSpan={5}>{ui.simulation.tableNoRecords}</td>
                    </tr>
                  ) : (
                    inspectedPeer.olsrRoutingTable.map((row, index) => (
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
              </table>,
            )}
          </>
        ) : null}
      </section>

      <footer className="simulation-panel__footer">
        <a
          className="simulation-panel__read-more"
          href={
            selectedProtocol === RoutingProtocol.DSDV
              ? "/docs/dsdv#routing-maintenance"
              : selectedProtocol === RoutingProtocol.DSR
                ? "/docs/dsr#route-cache"
                : selectedProtocol === RoutingProtocol.OLSR
                  ? "/docs/olsr#route-selection"
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
