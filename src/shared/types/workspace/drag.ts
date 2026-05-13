import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

import type { DragState } from "./interaction";
import type { ResizeEdge } from "../interaction";
import type { NetworkEntity, ObstacleEntity, PeerEntity } from "../model/entities";
import type { WorkspaceTextItem } from "./text";
import type { SetNullableStringState } from "./shared";
import type { UUID } from "../common/uuid";

export type WorkspaceDragRefs = {
  dragStateRef: MutableRefObject<DragState | null>;
};

export type WorkspaceDragSetters = {
  setActiveDragEntityId: SetNullableStringState;
  setSelectedTextId: SetNullableStringState;
};

export type WorkspaceDragEntities = NetworkEntity[];
export type WorkspaceDragTexts = WorkspaceTextItem[];

export type WorkspaceDragState = {
  editingTextId: UUID | null;
};

export type WorkspaceDragActions = {
  onEntitySelect: (id: UUID) => void;
  onTogglePlacementHint: () => void;
};

export type WorkspaceDragHandlers = {
  handleTextPointerDown: (item: WorkspaceTextItem, event: ReactPointerEvent<HTMLElement>) => void;
  handleObstaclePointerDown: (
    obstacle: ObstacleEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleObstacleResizeStart: (
    obstacle: ObstacleEntity,
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handlePeerPointerDownForDrag: (
    peer: PeerEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleEntityPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleEntityPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
};
