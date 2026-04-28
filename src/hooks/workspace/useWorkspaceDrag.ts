import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback } from "react";

import { workspaceObstacleMinSize } from "../../constants/workspace";
import { toInt } from "../../utils/geometry";
import type {
  EntitySetter,
  TextSetter,
  WorkspaceDragActions,
  WorkspaceDragHandlers,
  WorkspaceDragRefs,
  WorkspaceDragSetters,
  WorkspaceDragState,
} from "../../types/workspaceInteraction";
import type { ObstacleResizeEdge } from "../../types/interaction";
import type { ObstacleEntity, PeerEntity } from "../../types/navigation";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import type { WorkspaceTextItem } from "../../types/workspace";

type UseWorkspaceDragParams = {
  entities: Parameters<EntitySetter>[0];
  texts: Parameters<TextSetter>[0];
  setEntities: EntitySetter;
  setTexts: TextSetter;
  placementMode: ToolbarPlacementMode;
  refs: WorkspaceDragRefs;
  setters: WorkspaceDragSetters;
  state: WorkspaceDragState;
  actions: WorkspaceDragActions;
};

export function useWorkspaceDrag({
  entities,
  texts,
  setEntities,
  setTexts,
  placementMode,
  refs,
  setters,
  state,
  actions,
}: UseWorkspaceDragParams): WorkspaceDragHandlers {
  const dragStateRef = refs.dragStateRef;

  const updatePeerPosition = useCallback(
    (peerId: string, x: number, y: number) => {
      setEntities(
        entities.map((entity) => {
          if (entity.type !== "PEER" || entity.id !== peerId) {
            return entity;
          }

          return {
            ...entity,
            x,
            y,
          };
        }),
      );
    },
    [entities, setEntities],
  );

  const updateObstaclePosition = useCallback(
    (obstacleId: string, x: number, y: number) => {
      setEntities(
        entities.map((entity) => {
          if (entity.type !== "OBSTACLE" || entity.id !== obstacleId) {
            return entity;
          }

          return {
            ...entity,
            x,
            y,
          };
        }),
      );
    },
    [entities, setEntities],
  );

  const updateObstacleBounds = useCallback(
    (obstacleId: string, x: number, y: number, width: number, height: number) => {
      setEntities(
        entities.map((entity) => {
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
        }),
      );
    },
    [entities, setEntities],
  );

  const updateTextPosition = useCallback(
    (textId: string, x: number, y: number) => {
      setTexts(
        texts.map((item) =>
          item.id === textId
            ? {
                ...item,
                x,
                y,
              }
            : item,
        ),
      );
    },
    [setTexts, texts],
  );

  const handleTextPointerDown = useCallback(
    (item: WorkspaceTextItem, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();
      setters.setSelectedTextId(item.id);

      if (state.editingTextId === item.id) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragStateRef.current = {
        entityId: item.id,
        entityType: "TEXT",
        mode: "move",
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: item.x,
        startY: item.y,
      };
      setters.setActiveDragEntityId(item.id);
    },
    [dragStateRef, setters, state.editingTextId],
  );

  const handleObstaclePointerDown = useCallback(
    (obstacle: ObstacleEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      if (placementMode) {
        event.stopPropagation();
        if (placementMode === "toggle") {
          actions.onTogglePlacementHint();
        }
        return;
      }

      actions.onEntitySelect(obstacle.id);

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
      setters.setActiveDragEntityId(obstacle.id);
    },
    [actions, dragStateRef, placementMode, setters],
  );

  const handleObstacleResizeStart = useCallback(
    (
      obstacle: ObstacleEntity,
      edge: ObstacleResizeEdge,
      event: ReactPointerEvent<HTMLSpanElement>,
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();

      if (placementMode) {
        actions.onEntitySelect(obstacle.id);
        return;
      }

      actions.onEntitySelect(obstacle.id);

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
      setters.setActiveDragEntityId(obstacle.id);
    },
    [actions, dragStateRef, placementMode, setters],
  );

  const handlePeerPointerDownForDrag = useCallback(
    (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      actions.onEntitySelect(peer.id);

      if (peer.locked || placementMode) {
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
      setters.setActiveDragEntityId(peer.id);
    },
    [actions, dragStateRef, placementMode, setters],
  );

  const handleEntityPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
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

      if (dragState.mode === "move" && dragState.entityType === "TEXT") {
        updateTextPosition(dragState.entityId, nextX, nextY);
        return;
      }

      if (dragState.mode === "move") {
        updateObstaclePosition(dragState.entityId, nextX, nextY);
        return;
      }

      if (dragState.entityType !== "OBSTACLE") {
        return;
      }

      const startWidth = dragState.startWidth ?? workspaceObstacleMinSize;
      const startHeight = dragState.startHeight ?? workspaceObstacleMinSize;
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
        const nextLeft = Math.min(startRight - workspaceObstacleMinSize, startLeft + deltaX);
        nextObstacleWidth = startRight - nextLeft;
        nextObstacleX = (nextLeft + startRight) / 2;
      }

      if (edge === "right") {
        const nextRight = Math.max(startLeft + workspaceObstacleMinSize, startRight + deltaX);
        nextObstacleWidth = nextRight - startLeft;
        nextObstacleX = (startLeft + nextRight) / 2;
      }

      if (edge === "top") {
        const nextTop = Math.min(startBottom - workspaceObstacleMinSize, startTop + deltaY);
        nextObstacleHeight = startBottom - nextTop;
        nextObstacleY = (nextTop + startBottom) / 2;
      }

      if (edge === "bottom") {
        const nextBottom = Math.max(startTop + workspaceObstacleMinSize, startBottom + deltaY);
        nextObstacleHeight = nextBottom - startTop;
        nextObstacleY = (startTop + nextBottom) / 2;
      }

      updateObstacleBounds(
        dragState.entityId,
        toInt(nextObstacleX),
        toInt(nextObstacleY),
        Math.max(workspaceObstacleMinSize, toInt(nextObstacleWidth)),
        Math.max(workspaceObstacleMinSize, toInt(nextObstacleHeight)),
      );
    },
    [
      dragStateRef,
      updateObstacleBounds,
      updateObstaclePosition,
      updatePeerPosition,
      updateTextPosition,
    ],
  );

  const handleEntityPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
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
      setters.setActiveDragEntityId(null);
    },
    [dragStateRef, setters],
  );

  return {
    handleTextPointerDown,
    handleObstaclePointerDown,
    handleObstacleResizeStart,
    handlePeerPointerDownForDrag,
    handleEntityPointerMove,
    handleEntityPointerEnd,
  };
}
