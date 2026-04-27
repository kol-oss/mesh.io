import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Radio } from "lucide-react";

import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../types/navigation";

type WorkspaceProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  onEntitySelect: (id: string) => void;
  onClearSelection: () => void;
};

type DragState = {
  entityId: string;
  entityType: "PEER" | "OBSTACLE";
  mode: "move" | "resize";
  resizeEdge?: "left" | "right" | "top" | "bottom";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth?: number;
  startHeight?: number;
};

type ObstacleResizeEdge = "left" | "right" | "top" | "bottom";

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
const OBSTACLE_MIN_SIZE = 1;

// Shorten a line segment by `amount` pixels from each endpoint so lines
// terminate at the peer icon edge rather than the coordinate center.
const shortenLine = (x1: number, y1: number, x2: number, y2: number, amount: number) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len <= amount * 2) {
    return { x1, y1, x2, y2 };
  }
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  return {
    x1: x1 + ux * amount,
    y1: y1 + uy * amount,
    x2: x2 - ux * amount,
    y2: y2 - uy * amount,
  };
};

export default function Workspace({
  entities,
  setEntities,
  selectedId,
  selectedSource,
  onEntitySelect,
  onClearSelection,
}: WorkspaceProps) {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const peers = useMemo(
    () => entities.filter((entity): entity is PeerEntity => entity.type === "PEER"),
    [entities],
  );
  const links = useMemo(
    () => entities.filter((entity): entity is LinkEntity => entity.type === "LINK"),
    [entities],
  );
  const obstacles = useMemo(
    () => entities.filter((entity): entity is ObstacleEntity => entity.type === "OBSTACLE"),
    [entities],
  );
  const peerById = useMemo(() => new Map(peers.map((peer) => [peer.id, peer])), [peers]);
  const staticLinks = useMemo(() => {
    return links
      .map((link) => {
        if (!link.sourcePeerId || !link.destinationPeerId) {
          return null;
        }

        const sourcePeer = peerById.get(link.sourcePeerId);
        const destinationPeer = peerById.get(link.destinationPeerId);
        if (!sourcePeer || !destinationPeer || sourcePeer.id === destinationPeer.id) {
          return null;
        }

        return {
          id: link.id,
          enabled: link.enabled,
          sourceX: sourcePeer.x,
          sourceY: sourcePeer.y,
          destinationX: destinationPeer.x,
          destinationY: destinationPeer.y,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [links, peerById]);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });

  const dragStateRef = useRef<DragState | null>(null);
  const [activeDragEntityId, setActiveDragEntityId] = useState<string | null>(null);

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

  const updateObstaclePosition = (obstacleId: string, x: number, y: number) => {
    const nextEntities = entities.map((entity) => {
      if (entity.type !== "OBSTACLE" || entity.id !== obstacleId) {
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

  const updateObstacleBounds = (
    obstacleId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const nextEntities = entities.map((entity) => {
      if (entity.type !== "OBSTACLE" || entity.id !== obstacleId) {
        return entity;
      }

      return {
        ...entity,
        x,
        y,
        width,
        height,
      };
    });

    setEntities(nextEntities);
  };

  const handlePeerPointerDown = (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    onEntitySelect(peer.id);

    if (peer.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: peer.id,
      entityType: "PEER",
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: peer.x,
      startY: peer.y,
    };
    setActiveDragEntityId(peer.id);
  };

  const handleObstaclePointerDown = (
    obstacle: ObstacleEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    onEntitySelect(obstacle.id);

    if (obstacle.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: obstacle.id,
      entityType: "OBSTACLE",
      mode: "move",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: obstacle.x,
      startY: obstacle.y,
    };
    setActiveDragEntityId(obstacle.id);
  };

  const handleObstacleResizeStart = (
    obstacle: ObstacleEntity,
    edge: ObstacleResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    onEntitySelect(obstacle.id);

    if (obstacle.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      entityId: obstacle.id,
      entityType: "OBSTACLE",
      mode: "resize",
      resizeEdge: edge,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: obstacle.x,
      startY: obstacle.y,
      startWidth: obstacle.width,
      startHeight: obstacle.height,
    };
    setActiveDragEntityId(obstacle.id);
  };

  const handleEntityPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const nextX = toInt(dragState.startX + deltaX);
    const nextY = toInt(dragState.startY + deltaY);

    if (dragState.mode === "move" && dragState.entityType === "PEER") {
      updatePeerPosition(dragState.entityId, nextX, nextY);
      return;
    }

    if (dragState.mode === "move") {
      updateObstaclePosition(dragState.entityId, nextX, nextY);
      return;
    }

    if (dragState.entityType !== "OBSTACLE") {
      return;
    }

    const startWidth = dragState.startWidth ?? OBSTACLE_MIN_SIZE;
    const startHeight = dragState.startHeight ?? OBSTACLE_MIN_SIZE;
    const startLeft = dragState.startX - startWidth / 2;
    const startRight = dragState.startX + startWidth / 2;
    const startTop = dragState.startY - startHeight / 2;
    const startBottom = dragState.startY + startHeight / 2;
    const edge = dragState.resizeEdge;

    if (!edge) {
      return;
    }

    let nextObstacleX = dragState.startX;
    let nextObstacleY = dragState.startY;
    let nextObstacleWidth = startWidth;
    let nextObstacleHeight = startHeight;

    if (edge === "left") {
      const nextLeft = Math.min(startRight - OBSTACLE_MIN_SIZE, startLeft + deltaX);
      nextObstacleWidth = startRight - nextLeft;
      nextObstacleX = (nextLeft + startRight) / 2;
    }

    if (edge === "right") {
      const nextRight = Math.max(startLeft + OBSTACLE_MIN_SIZE, startRight + deltaX);
      nextObstacleWidth = nextRight - startLeft;
      nextObstacleX = (startLeft + nextRight) / 2;
    }

    if (edge === "top") {
      const nextTop = Math.min(startBottom - OBSTACLE_MIN_SIZE, startTop + deltaY);
      nextObstacleHeight = startBottom - nextTop;
      nextObstacleY = (nextTop + startBottom) / 2;
    }

    if (edge === "bottom") {
      const nextBottom = Math.max(startTop + OBSTACLE_MIN_SIZE, startBottom + deltaY);
      nextObstacleHeight = nextBottom - startTop;
      nextObstacleY = (startTop + nextBottom) / 2;
    }

    updateObstacleBounds(
      dragState.entityId,
      toInt(nextObstacleX),
      toInt(nextObstacleY),
      Math.max(OBSTACLE_MIN_SIZE, toInt(nextObstacleWidth)),
      Math.max(OBSTACLE_MIN_SIZE, toInt(nextObstacleHeight)),
    );

    return;
  };

  const handleEntityPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
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
    setActiveDragEntityId(null);
  };

  return (
    <section className="workspace" onPointerDown={onClearSelection} ref={workspaceRef}>
      <div className="workspace__grid" aria-hidden="true" />
      <svg className="workspace__static-links" aria-hidden="true">
        {staticLinks.map((link) => {
          const rawSourceX = centerX + link.sourceX;
          const rawSourceY = centerY + link.sourceY;
          const rawTargetX = centerX + link.destinationX;
          const rawTargetY = centerY + link.destinationY;
          const { x1, y1, x2, y2 } = shortenLine(
            rawSourceX,
            rawSourceY,
            rawTargetX,
            rawTargetY,
            14,
          );
          const isSelected = selectedSource === "entities" && selectedId === link.id;

          return (
            <g
              key={link.id}
              className={`workspace__static-link ${link.enabled ? "workspace__static-link--enabled" : "workspace__static-link--disabled"}${isSelected ? " workspace__static-link--selected" : ""}`}
            >
              <line
                className="workspace__static-link-hit"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onEntitySelect(link.id);
                }}
              />
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
            </g>
          );
        })}
      </svg>
      <svg className="workspace__connections" aria-hidden="true">
        {connections.map((connection) => {
          const rawSourceX = centerX + connection.sourceX;
          const rawSourceY = centerY + connection.sourceY;
          const rawTargetX = centerX + connection.targetX;
          const rawTargetY = centerY + connection.targetY;
          const { x1, y1, x2, y2 } = shortenLine(
            rawSourceX,
            rawSourceY,
            rawTargetX,
            rawTargetY,
            14,
          );
          const isMutual = connection.type === "MUTUAL";

          return (
            <g
              key={`${connection.type}-${connection.sourceId}-${connection.targetId}`}
              className={`workspace__connection ${
                isMutual ? "workspace__connection--mutual" : "workspace__connection--one-way"
              }`}
            >
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
            </g>
          );
        })}
      </svg>

      {obstacles.map((obstacle) => {
        const isSelected = selectedSource === "entities" && selectedId === obstacle.id;
        return (
          <button
            key={obstacle.id}
            className={`workspace__obstacle${isSelected ? " workspace__obstacle--selected" : ""}${activeDragEntityId === obstacle.id ? " workspace__obstacle--dragging" : ""}`}
            style={{
              left: `calc(50% + ${obstacle.x}px)`,
              top: `calc(50% + ${obstacle.y}px)`,
              width: `${Math.max(1, obstacle.width)}px`,
              height: `${Math.max(1, obstacle.height)}px`,
            }}
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              handleObstaclePointerDown(obstacle, event);
            }}
            onPointerMove={handleEntityPointerMove}
            onPointerUp={handleEntityPointerEnd}
            onPointerCancel={handleEntityPointerEnd}
            aria-label={`Obstacle ${obstacle.name}`}
          >
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--left"
              onPointerDown={(event) => handleObstacleResizeStart(obstacle, "left", event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--right"
              onPointerDown={(event) => handleObstacleResizeStart(obstacle, "right", event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--top"
              onPointerDown={(event) => handleObstacleResizeStart(obstacle, "top", event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--bottom"
              onPointerDown={(event) => handleObstacleResizeStart(obstacle, "bottom", event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
          </button>
        );
      })}

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
              className={`workspace__peer${isSelected ? " workspace__peer--selected" : ""}${activeDragEntityId === peer.id ? " workspace__peer--dragging" : ""}${peer.enabled ? "" : " workspace__peer--disabled"}`}
              style={{
                left: `calc(50% + ${peer.x}px)`,
                top: `calc(50% + ${peer.y}px)`,
              }}
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                handlePeerPointerDown(peer, event);
              }}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
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
