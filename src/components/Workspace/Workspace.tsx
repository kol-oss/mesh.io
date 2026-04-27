import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Radio } from "lucide-react";

import { clamp } from "../../utils/math/clamp";
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

type ObstacleBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type RangePolygon = {
  peerId: string;
  enabled: boolean;
  selected: boolean;
  path: string;
};

const toInt = (value: number) => Math.round(value);
const OBSTACLE_MIN_SIZE = 1;
const RANGE_SAMPLES = 180;
const PAN_LIMIT = 2000;

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

const getObstacleBounds = (obstacle: ObstacleEntity): ObstacleBounds => {
  const halfWidth = Math.max(OBSTACLE_MIN_SIZE, obstacle.width) / 2;
  const halfHeight = Math.max(OBSTACLE_MIN_SIZE, obstacle.height) / 2;

  return {
    left: obstacle.x - halfWidth,
    right: obstacle.x + halfWidth,
    top: obstacle.y - halfHeight,
    bottom: obstacle.y + halfHeight,
  };
};

const rayObstacleIntersectionDistance = (
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  obstacle: ObstacleBounds,
): number | null => {
  let tMin = Number.NEGATIVE_INFINITY;
  let tMax = Number.POSITIVE_INFINITY;

  if (Math.abs(dirX) < Number.EPSILON) {
    if (originX < obstacle.left || originX > obstacle.right) {
      return null;
    }
  } else {
    const tx1 = (obstacle.left - originX) / dirX;
    const tx2 = (obstacle.right - originX) / dirX;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(dirY) < Number.EPSILON) {
    if (originY < obstacle.top || originY > obstacle.bottom) {
      return null;
    }
  } else {
    const ty1 = (obstacle.top - originY) / dirY;
    const ty2 = (obstacle.bottom - originY) / dirY;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  if (tMax < tMin || tMax < 0) {
    return null;
  }

  if (tMin > 0) {
    return tMin;
  }

  return tMax > 0 ? 0 : null;
};

const getRayDistanceWithObstacleBlocking = (
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  maxDistance: number,
  obstacles: ObstacleBounds[],
) => {
  let minDistance = maxDistance;

  for (const obstacle of obstacles) {
    const hitDistance = rayObstacleIntersectionDistance(originX, originY, dirX, dirY, obstacle);
    if (hitDistance === null) {
      continue;
    }

    minDistance = Math.min(minDistance, hitDistance);
    if (minDistance <= 0) {
      break;
    }
  }

  return Math.max(0, minDistance);
};

const pointInsideObstacle = (x: number, y: number, obstacle: ObstacleBounds) => {
  return x >= obstacle.left && x <= obstacle.right && y >= obstacle.top && y <= obstacle.bottom;
};

const segmentIntersectsObstacle = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  obstacle: ObstacleBounds,
) => {
  if (pointInsideObstacle(startX, startY, obstacle) || pointInsideObstacle(endX, endY, obstacle)) {
    return true;
  }

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(deltaX) < Number.EPSILON) {
    if (startX < obstacle.left || startX > obstacle.right) {
      return false;
    }
  } else {
    const tx1 = (obstacle.left - startX) / deltaX;
    const tx2 = (obstacle.right - startX) / deltaX;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  if (Math.abs(deltaY) < Number.EPSILON) {
    if (startY < obstacle.top || startY > obstacle.bottom) {
      return false;
    }
  } else {
    const ty1 = (obstacle.top - startY) / deltaY;
    const ty2 = (obstacle.bottom - startY) / deltaY;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  return tMax >= tMin;
};

const hasLineOfSight = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  obstacles: ObstacleBounds[],
) => {
  return !obstacles.some((obstacle) =>
    segmentIntersectsObstacle(startX, startY, endX, endY, obstacle),
  );
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
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

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

  const obstacleBounds = useMemo(() => obstacles.map(getObstacleBounds), [obstacles]);

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
        const clearLineOfSight = hasLineOfSight(peerA.x, peerA.y, peerB.x, peerB.y, obstacleBounds);

        const aToB = distance <= peerA.range && clearLineOfSight;
        const bToA = distance <= peerB.range && clearLineOfSight;

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
  }, [obstacleBounds, peers]);

  const centerX = workspaceSize.width / 2;
  const centerY = workspaceSize.height / 2;

  const rangePolygons = useMemo(() => {
    if (workspaceSize.width <= 0 || workspaceSize.height <= 0) {
      return [];
    }

    return peers
      .filter((peer) => peer.range > 0)
      .map<RangePolygon>((peer) => {
        const points: string[] = [];
        const baseX = centerX + peer.x;
        const baseY = centerY + peer.y;

        for (let index = 0; index <= RANGE_SAMPLES; index += 1) {
          const angle = (index / RANGE_SAMPLES) * Math.PI * 2;
          const dirX = Math.cos(angle);
          const dirY = Math.sin(angle);
          const distance = getRayDistanceWithObstacleBlocking(
            peer.x,
            peer.y,
            dirX,
            dirY,
            peer.range,
            obstacleBounds,
          );
          const pointX = baseX + dirX * distance;
          const pointY = baseY + dirY * distance;
          points.push(`${pointX.toFixed(2)},${pointY.toFixed(2)}`);
        }

        const path = points.length > 0 ? `M ${points[0]} L ${points.slice(1).join(" L ")} Z` : "";

        return {
          peerId: peer.id,
          enabled: peer.enabled,
          selected: selectedSource === "entities" && selectedId === peer.id,
          path,
        };
      });
  }, [centerX, centerY, obstacleBounds, peers, selectedId, selectedSource, workspaceSize]);

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

  const handleBackgroundPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    onClearSelection();
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    panStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
  };

  const handleBackgroundPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pan.startClientX;
    const deltaY = event.clientY - pan.startClientY;
    setPanOffset({
      x: clamp(pan.startPanX + deltaX, -PAN_LIMIT, PAN_LIMIT),
      y: clamp(pan.startPanY + deltaY, -PAN_LIMIT, PAN_LIMIT),
    });
  };

  const handleBackgroundPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }
    panStateRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  return (
    <section
      className="workspace"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerEnd}
      onPointerCancel={handleBackgroundPointerEnd}
      ref={workspaceRef}
    >
      <div
        className="workspace__grid"
        aria-hidden="true"
        style={{
          backgroundPosition: `calc(50% - 24px + ${panOffset.x}px) calc(50% - 24px + ${panOffset.y}px)`,
        }}
      />
      <div
        className="workspace__scene"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
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
        <svg className="workspace__ranges" aria-hidden="true">
          {rangePolygons.map((polygon) => (
            <path
              key={polygon.peerId}
              d={polygon.path}
              className={`workspace__peer-range${polygon.selected ? " workspace__peer-range--selected" : ""}${polygon.enabled ? "" : " workspace__peer-range--disabled"}`}
            />
          ))}
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
      </div>
    </section>
  );
}
