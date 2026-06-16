import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

import type { UUID } from "@/shared/types/common/uuid";
import type { ResizeEdge } from "@/shared/types/interaction";
import type { NetworkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { DragState } from "./interaction";
import type { SetNullableStringState } from "./shared";
import type { TextItem } from "./text";

export type WorkspaceDragRefs = {
  dragStateRef: MutableRefObject<DragState | null>;
};

export type WorkspaceDragSetters = {
  setActiveDragEntityId: SetNullableStringState;
  setSelectedTextId: SetNullableStringState;
};

export type WorkspaceDragEntities = NetworkEntity[];
export type WorkspaceDragTexts = TextItem[];

export type WorkspaceDragState = {
  editingTextId: UUID | null;
};

export type WorkspaceDragActions = {
  onEntitySelect: (id: UUID) => void;
  onTogglePlacementHint: () => void;
};

export type WorkspaceDragHandlers = {
  handleTextPointerDown: (item: TextItem, event: ReactPointerEvent<HTMLElement>) => void;
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
