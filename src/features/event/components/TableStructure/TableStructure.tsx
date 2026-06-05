import DsrTableStructure from "@/features/event/components/TableStructure/DsrTableStructure.tsx";
import type { ProtocolTables } from "@/features/processor/types/peerTables";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerSnapshot, StepResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
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

  const inspectedSnapshot = peerTables?.find((p) => p.peerId === inspectedPeerId) ?? null;

  if (!inspectedSnapshot) {
    return null;
  }

  const peerEntities = currentStepResult.snapshot.entities.filter(
    (e): e is PeerEntity => e.type === EntityType.Peer,
  );
  const inspectedPeerEntity = peerEntities.find((e) => e.id === inspectedPeerId) ?? null;
  const peerName = inspectedPeerEntity?.name ?? inspectedPeerId;

  const { tables } = inspectedSnapshot;
  const selectedProtocol: RoutingProtocol = tables.protocol;

  const renderTables = (tables: ProtocolTables) => {
    if (tables.protocol === RoutingProtocol.BATMAN) {
      return (
        <BatmanTableStructure
          tables={tables}
          peers={peerEntities}
          onPeerNameHover={onPeerHoverChange}
        />
      );
    }
    if (tables.protocol === RoutingProtocol.DSDV) {
      return (
        <DsdvTableStructure
          tables={tables}
          peers={peerEntities}
          onPeerNameHover={onPeerHoverChange}
        />
      );
    }
    if (tables.protocol === RoutingProtocol.DSR) {
      return (
        <DsrTableStructure
          tables={tables}
          peerId={inspectedPeerId}
          peers={peerEntities}
          onPeerNameHover={onPeerHoverChange}
        />
      );
    }
    if (tables.protocol === RoutingProtocol.AODV) {
      return (
        <AodvTableStructure
          tables={tables}
          peers={peerEntities}
          onPeerNameHover={onPeerHoverChange}
        />
      );
    }
    if (tables.protocol === RoutingProtocol.OLSR) {
      return (
        <OlsrTableStructure
          tables={tables}
          peers={peerEntities}
          onPeerNameHover={onPeerHoverChange}
        />
      );
    }
    return null;
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
            ? `DSDV Structures on ${peerName}`
            : selectedProtocol === RoutingProtocol.AODV
              ? `AODV Structures on ${peerName}`
              : selectedProtocol === RoutingProtocol.DSR
                ? `DSR Structures on ${peerName}`
                : selectedProtocol === RoutingProtocol.OLSR
                  ? `OLSR Structures on ${peerName}`
                  : `B.A.T.M.A.N. V Structures on ${peerName}`}
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
        {renderTables(tables)}
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
