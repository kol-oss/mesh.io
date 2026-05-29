import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerSnapshot, StepResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import { ChevronRight, ExternalLink, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import BatmanTableStructure from "./BatmanTableStructure";
import DsdvTableStructure from "./DsdvTableStructure";
import OlsrTableStructure from "./OlsrTableStructure";

type TableStructureProps = {
  isOpen: boolean;
  currentStepResult: StepResult | null;
  inspectedPeerId: UUID | null;
  peerTables: PeerSnapshot[] | null;
  onClose: () => void;
  onPeerHoverChange: (peerId: UUID | null) => void;
};

export default function TableStructure({
  isOpen,
  currentStepResult,
  inspectedPeerId,
  peerTables,
  onClose,
  onPeerHoverChange,
}: TableStructureProps) {
  // Drag state
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    batmanNeighbours: false,
    batmanOriginators: true,
    dsdvRoutes: false,
    aodvRoutes: false,
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

  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );
  const inspectedPeer = peerTables?.find((peer) => peer.id === inspectedPeerId) ?? null;

  if (!inspectedPeer) {
    return null;
  }

  const selectedProtocol = inspectedPeer.protocol;

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
      aria-label={"Simulation event"}
      onPointerDown={handlePanelPointerDown}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header
        className="simulation-panel__header simulation-panel__header--draggable"
        onPointerDown={handleHeaderPointerDown}
      >
        <h2 className="simulation-panel__title">
          {selectedProtocol === RoutingProtocol.DSDV
            ? `DSDV Structures on ${inspectedPeer.name}`
            : selectedProtocol === RoutingProtocol.AODV
              ? `AODV Structures on ${inspectedPeer.name}`
              : selectedProtocol === RoutingProtocol.DSR
                ? `DSR Structures on ${inspectedPeer.name}`
                : selectedProtocol === RoutingProtocol.OLSR
                  ? `OLSR Structures on ${inspectedPeer.name}`
                  : `B.A.T.M.A.N. V Structures on ${inspectedPeer.name}`}
        </h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={"Close packet structure"}
        >
          <X size={14} />
        </button>
      </header>

      <section className="simulation-panel__section" onMouseLeave={() => onPeerHoverChange(null)}>
        {selectedProtocol === RoutingProtocol.BATMAN ? (
          <BatmanTableStructure
            peer={inspectedPeer}
            peers={currentStepResult.snapshot.peers}
            onPeerNameHover={onPeerHoverChange}
          />
        ) : selectedProtocol === RoutingProtocol.DSDV ? (
          <DsdvTableStructure
            peer={inspectedPeer}
            peers={currentStepResult.snapshot.peers}
            onPeerNameHover={onPeerHoverChange}
          />
        ) : selectedProtocol === RoutingProtocol.AODV ? (
          renderCollapsibleBlock(
            "aodvRoutes",
            "AODV Routing Table",
            <table className="simulation-panel__table-view">
              <thead>
                <tr>
                  <th>{"Destination"}</th>
                  <th>{"Next Hop"}</th>
                  <th>{"Metric"}</th>
                  <th>{"Sequence Number"}</th>
                  <th>{"Precursors"}</th>
                  <th>{"Last Update"}</th>
                </tr>
              </thead>
              <tbody>
                {inspectedPeer.aodvRoutingTable.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{"No records"}</td>
                  </tr>
                ) : (
                  inspectedPeer.aodvRoutingTable.map((row, index) => (
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
                        {row.precursors.length === 0
                          ? "No records"
                          : row.precursors
                              .map((peerId) => getPeerLabel(peerId, peerNameById))
                              .join(", ")}
                      </td>
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
            "DSR Route Cache",
            <table className="simulation-panel__table-view">
              <thead>
                <tr>
                  <th>{"Destination"}</th>
                  <th>{"Next Hop"}</th>
                  <th>{"Metric"}</th>
                  <th>{"Sequence Number"}</th>
                  <th>{"Path"}</th>
                  <th>{"Last Update"}</th>
                </tr>
              </thead>
              <tbody>
                {inspectedPeer.dsrRoutingTable.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{"No records"}</td>
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
          <OlsrTableStructure
            peer={inspectedPeer}
            peers={currentStepResult.snapshot.peers}
            onPeerNameHover={onPeerHoverChange}
          />
        ) : null}
      </section>

      <footer className="simulation-panel__footer">
        <a
          className="simulation-panel__read-more"
          href={
            selectedProtocol === RoutingProtocol.DSDV
              ? "/docs/dsdv#routing-maintenance"
              : selectedProtocol === RoutingProtocol.AODV
                ? "/docs/aodv#routing-table"
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
          {"Read more"}
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
