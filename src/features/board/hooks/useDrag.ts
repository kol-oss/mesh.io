import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback } from "react";

import { toInt } from "@/features/processor/utils/connectivity";
import { OBSTACLE_MIN_HEIGHT, OBSTACLE_MIN_WIDTH } from "@/shared/constants/entities/obstacle";
import type { ToolbarPlacementMode } from "@/shared/types/action";
import { ActionMode as PlacementMode } from "@/shared/types/action";
import type { UUID } from "@/shared/types/common/uuid";
import { DragEntityType, DragMode, ResizeEdge } from "@/shared/types/interaction";
import type { ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type {
  WorkspaceDragActions,
  WorkspaceDragEntities,
  WorkspaceDragHandlers,
  WorkspaceDragRefs,
  WorkspaceDragSetters,
  WorkspaceDragState,
  WorkspaceDragTexts,
} from "@/shared/types/workspace/drag";
import type { SetEntities, SetTexts } from "@/shared/types/workspace/shared";
import type { TextItem } from "@/shared/types/workspace/text";

type UseDragParams = {
  entities: WorkspaceDragEntities;
  texts: WorkspaceDragTexts;
  setEntities: SetEntities;
  setTexts: SetTexts;
  placementMode: ToolbarPlacementMode;
  refs: WorkspaceDragRefs;
  setters: WorkspaceDragSetters;
  state: WorkspaceDragState;
  actions: WorkspaceDragActions;
};

export function useDrag({
  entities,
  texts,
  setEntities,
  setTexts,
  placementMode,
  refs,
  setters,
  state,
  actions,
}: UseDragParams): WorkspaceDragHandlers {
  const dragStateRef = refs.dragStateRef;

  const updatePeerPosition = useCallback(
    (peerId: UUID, x: number, y: number) => {
      setEntities(
        entities.map((entity) => {
          if (entity.type !== EntityType.Peer || entity.id !== peerId) {
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
    (obstacleId: UUID, x: number, y: number) => {
      setEntities(
        entities.map((entity) => {
          if (entity.type !== EntityType.Obstacle || entity.id !== obstacleId) {
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
    (obstacleId: UUID, x: number, y: number, width: number, height: number) => {
      setEntities(
        entities.map((entity) => {
          if (entity.type !== EntityType.Obstacle || entity.id !== obstacleId) {
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
    (textId: UUID, x: number, y: number) => {
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
    (item: TextItem, event: ReactPointerEvent<HTMLElement>) => {
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
        entityType: DragEntityType.Text,
        mode: DragMode.Move,
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
        if (placementMode === PlacementMode.Toggle) {
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
        entityType: DragEntityType.Obstacle,
        mode: DragMode.Move,
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
    (obstacle: ObstacleEntity, edge: ResizeEdge, event: ReactPointerEvent<HTMLSpanElement>) => {
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
        entityType: DragEntityType.Obstacle,
        mode: DragMode.Resize,
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
        entityType: DragEntityType.Peer,
        mode: DragMode.Move,
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

      if (dragState.mode === DragMode.Move && dragState.entityType === DragEntityType.Peer) {
        updatePeerPosition(dragState.entityId, nextX, nextY);
        return;
      }

      if (dragState.mode === DragMode.Move && dragState.entityType === DragEntityType.Text) {
        updateTextPosition(dragState.entityId, nextX, nextY);
        return;
      }

      if (dragState.mode === DragMode.Move) {
        updateObstaclePosition(dragState.entityId, nextX, nextY);
        return;
      }

      if (dragState.entityType !== DragEntityType.Obstacle) {
        return;
      }

      const startWidth = dragState.startWidth ?? OBSTACLE_MIN_WIDTH;
      const startHeight = dragState.startHeight ?? OBSTACLE_MIN_HEIGHT;
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

      if (edge === ResizeEdge.Left) {
        const nextLeft = Math.min(startRight - OBSTACLE_MIN_WIDTH, startLeft + deltaX);
        nextObstacleWidth = startRight - nextLeft;
        nextObstacleX = (nextLeft + startRight) / 2;
      }

      if (edge === ResizeEdge.Right) {
        const nextRight = Math.max(startLeft + OBSTACLE_MIN_WIDTH, startRight + deltaX);
        nextObstacleWidth = nextRight - startLeft;
        nextObstacleX = (startLeft + nextRight) / 2;
      }

      if (edge === ResizeEdge.Top) {
        const nextTop = Math.min(startBottom - OBSTACLE_MIN_HEIGHT, startTop + deltaY);
        nextObstacleHeight = startBottom - nextTop;
        nextObstacleY = (nextTop + startBottom) / 2;
      }

      if (edge === ResizeEdge.Bottom) {
        const nextBottom = Math.max(startTop + OBSTACLE_MIN_HEIGHT, startBottom + deltaY);
        nextObstacleHeight = nextBottom - startTop;
        nextObstacleY = (startTop + nextBottom) / 2;
      }

      updateObstacleBounds(
        dragState.entityId,
        toInt(nextObstacleX),
        toInt(nextObstacleY),
        Math.max(OBSTACLE_MIN_WIDTH, toInt(nextObstacleWidth)),
        Math.max(OBSTACLE_MIN_HEIGHT, toInt(nextObstacleHeight)),
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
