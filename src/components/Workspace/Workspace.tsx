import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

type Connection =
  | {
      type: "MUTUAL";
      sourceId: string;
      targetId: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
    }
  | {
      type: "ONE_WAY";
      sourceId: string;
      targetId: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
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
  const workspaceRef = useRef<HTMLElement | null>(null);
  const peers = useMemo(
    () => entities.filter((entity): entity is PeerEntity => entity.type === "PEER"),
    [entities],
  );
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });

  const dragStateRef = useRef<DragState | null>(null);
  const [activeDragPeerId, setActiveDragPeerId] = useState<string | null>(null);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      setWorkspaceSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const connections = useMemo(() => {
    const enabledPeers = peers.filter((peer) => peer.enabled);
    const result: Connection[] = [];

    for (let i = 0; i < enabledPeers.length; i += 1) {
      for (let j = i + 1; j < enabledPeers.length; j += 1) {
        const peerA = enabledPeers[i];
        const peerB = enabledPeers[j];
        const deltaX = peerB.x - peerA.x;
        const deltaY = peerB.y - peerA.y;
        const distance = Math.hypot(deltaX, deltaY);

        const aToB = distance <= peerA.range;
        const bToA = distance <= peerB.range;

        if (aToB && bToA) {
          result.push({
            type: "MUTUAL",
            sourceId: peerA.id,
            targetId: peerB.id,
            sourceX: peerA.x,
            sourceY: peerA.y,
            targetX: peerB.x,
            targetY: peerB.y,
          });
          continue;
        }

        if (aToB) {
          result.push({
            type: "ONE_WAY",
            sourceId: peerA.id,
            targetId: peerB.id,
            sourceX: peerA.x,
            sourceY: peerA.y,
            targetX: peerB.x,
            targetY: peerB.y,
          });
        }

        if (bToA) {
          result.push({
            type: "ONE_WAY",
            sourceId: peerB.id,
            targetId: peerA.id,
            sourceX: peerB.x,
            sourceY: peerB.y,
            targetX: peerA.x,
            targetY: peerA.y,
          });
        }
      }
    }

    return result;
  }, [peers]);

  const centerX = workspaceSize.width / 2;
  const centerY = workspaceSize.height / 2;

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
    <section className="workspace" onPointerDown={onClearSelection} ref={workspaceRef}>
      <div className="workspace__grid" aria-hidden="true" />
      <svg className="workspace__connections" aria-hidden="true">
        {connections.map((connection) => {
          const sourceX = centerX + connection.sourceX;
          const sourceY = centerY + connection.sourceY;
          const targetX = centerX + connection.targetX;
          const targetY = centerY + connection.targetY;
          const isMutual = connection.type === "MUTUAL";

          return (
            <g
              key={`${connection.type}-${connection.sourceId}-${connection.targetId}`}
              className={`workspace__connection ${
                isMutual ? "workspace__connection--mutual" : "workspace__connection--one-way"
              }`}
            >
              <line x1={sourceX} y1={sourceY} x2={targetX} y2={targetY} />
            </g>
          );
        })}
      </svg>

      {peers.map((peer) => {
        const isSelected = selectedSource === "entities" && selectedId === peer.id;
        return (
          <div key={peer.id}>
            {peer.range > 0 && (
              <div
                className={`workspace__peer-range${isSelected ? " workspace__peer-range--selected" : ""}${peer.enabled ? "" : " workspace__peer-range--disabled"}`}
                style={{
                  left: `calc(50% + ${peer.x}px)`,
                  top: `calc(50% + ${peer.y}px)`,
                  width: `${peer.range * 2}px`,
                  height: `${peer.range * 2}px`,
                }}
                aria-hidden="true"
              />
            )}

            <button
              className={`workspace__peer${isSelected ? " workspace__peer--selected" : ""}${activeDragPeerId === peer.id ? " workspace__peer--dragging" : ""}${peer.enabled ? "" : " workspace__peer--disabled"}`}
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
                <Radio size={20} />
              </span>
              <span className="workspace__peer-name">{peer.name}</span>
            </button>
          </div>
        );
      })}
    </section>
  );
}
