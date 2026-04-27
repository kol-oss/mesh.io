import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Radio } from "lucide-react";

import type { NetworkEntity, PeerEntity } from "../../types/navigation";

type WorkspaceProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  onPeerSelect: (id: string) => void;
  onClearSelection: () => void;
};

type DragState = {
  peerId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

const toInt = (value: number) => Math.round(value);

export default function Workspace({
  entities,
  setEntities,
  selectedId,
  selectedSource,
  onPeerSelect,
  onClearSelection,
}: WorkspaceProps) {
  const peers = useMemo(
    () => entities.filter((entity): entity is PeerEntity => entity.type === "PEER"),
    [entities],
  );

  const dragStateRef = useRef<DragState | null>(null);
  const [activeDragPeerId, setActiveDragPeerId] = useState<string | null>(null);

  const updatePeerPosition = (peerId: string, x: number, y: number) => {
    const nextEntities = entities.map((entity) => {
      if (entity.type !== "PEER" || entity.id !== peerId) {
        return entity;
      }

      return {
        ...entity,
        x,
        y,
      };
    });

    setEntities(nextEntities);
  };

  const handlePeerPointerDown = (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    onPeerSelect(peer.id);

    if (peer.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      peerId: peer.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: peer.x,
      startY: peer.y,
    };
    setActiveDragPeerId(peer.id);
  };

  const handlePeerPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    updatePeerPosition(
      dragState.peerId,
      toInt(dragState.startX + deltaX),
      toInt(dragState.startY + deltaY),
    );
  };

  const handlePeerPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }

    dragStateRef.current = null;
    setActiveDragPeerId(null);
  };

  return (
    <section className="workspace" onPointerDown={onClearSelection}>
      <div className="workspace__grid" aria-hidden="true" />

      {peers.map((peer) => {
        const isSelected = selectedSource === "entities" && selectedId === peer.id;
        return (
          <button
            key={peer.id}
            className={`workspace__peer${isSelected ? " workspace__peer--selected" : ""}${activeDragPeerId === peer.id ? " workspace__peer--dragging" : ""}`}
            style={{
              left: `calc(50% + ${peer.x}px)`,
              top: `calc(50% + ${peer.y}px)`,
            }}
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              handlePeerPointerDown(peer, event);
            }}
            onPointerMove={handlePeerPointerMove}
            onPointerUp={handlePeerPointerEnd}
            onPointerCancel={handlePeerPointerEnd}
            aria-label={`Peer ${peer.name}`}
          >
            <span className="workspace__peer-icon">
              <Radio size={16} />
            </span>
            <span className="workspace__peer-name">{peer.name}</span>
          </button>
        );
      })}
    </section>
  );
}
