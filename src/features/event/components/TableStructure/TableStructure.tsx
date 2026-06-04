import DsrTableStructure from "@/features/event/components/TableStructure/DsrTableStructure.tsx";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerSnapshot, StepResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import AodvTableStructure from "./AodvTableStructure";
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

  const inspectedPeer = peerTables?.find((peer) => peer.id === inspectedPeerId) ?? null;

  if (!inspectedPeer) {
    return null;
  }

  const selectedProtocol = inspectedPeer.protocol;

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
        ) : selectedProtocol === RoutingProtocol.DSR ? (
          <DsrTableStructure
            peer={inspectedPeer}
            peers={currentStepResult.snapshot.peers}
            onPeerNameHover={onPeerHoverChange}
          />
        ) : selectedProtocol === RoutingProtocol.AODV ? (
          <AodvTableStructure
            peer={inspectedPeer}
            peers={currentStepResult.snapshot.peers}
            onPeerNameHover={onPeerHoverChange}
          />
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
