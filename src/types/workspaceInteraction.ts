import type {
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from "react";

import type { DragState, ObstacleResizeEdge } from "./interaction";
import type { NetworkEntity, ObstacleEntity, PeerEntity } from "./navigation";
import type { WorkspaceTextItem } from "./workspace";

export type EntitySetter = (value: NetworkEntity[]) => void;
export type TextSetter = (value: WorkspaceTextItem[]) => void;

export type WorkspaceDragRefs = {
  dragStateRef: MutableRefObject<DragState | null>;
};

export type WorkspaceDragSetters = {
  setActiveDragEntityId: Dispatch<SetStateAction<string | null>>;
  setSelectedTextId: Dispatch<SetStateAction<string | null>>;
};

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
