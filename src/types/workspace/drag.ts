import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

import type { DragState, ObstacleResizeEdge } from "./interaction";
import type { NetworkEntity, ObstacleEntity, PeerEntity } from "../navigation";
import type { WorkspaceTextItem } from "./index";
import type { SetEntities, SetNullableStringState, SetTexts } from "./shared";

export type WorkspaceDragRefs = {
  dragStateRef: MutableRefObject<DragState | null>;
};

export type WorkspaceDragSetters = {
  setActiveDragEntityId: SetNullableStringState;
  setSelectedTextId: SetNullableStringState;
};

export type WorkspaceDragEntities = NetworkEntity[];
export type WorkspaceDragTexts = WorkspaceTextItem[];
export type WorkspaceDragEntitySetter = SetEntities;
export type WorkspaceDragTextSetter = SetTexts;

export type WorkspaceDragState = {
  editingTextId: string | null;
};

export type WorkspaceDragActions = {
  onEntitySelect: (id: string) => void;
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
    edge: ObstacleResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handlePeerPointerDownForDrag: (
    peer: PeerEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleEntityPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleEntityPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
};
