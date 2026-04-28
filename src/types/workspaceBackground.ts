import type {
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
} from "react";

import type { ToolbarPlacementMode } from "./toolbar";

export type WorkspacePanState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
};

export type WorkspaceBackgroundRefs = {
  workspaceRef: RefObject<HTMLElement | null>;
  linkSourcePeerIdRef: MutableRefObject<string | null>;
  stepMessageSourcePeerIdRef: MutableRefObject<string | null>;
  stepMovePeerIdRef: MutableRefObject<string | null>;
  panStateRef: MutableRefObject<WorkspacePanState | null>;
};

export type WorkspaceBackgroundState = {
  placementMode: ToolbarPlacementMode;
  editingTextId: string | null;
  panOffset: { x: number; y: number };
  workspaceSize: { width: number; height: number };
};

export type WorkspaceBackgroundSetters = {
  setSelectedTextId: Dispatch<SetStateAction<string | null>>;
  setCreationSelectedEntityId: Dispatch<SetStateAction<string | null>>;
  setMoveTargetPreview: Dispatch<SetStateAction<{ x: number; y: number } | null>>;
  setPanOffset: Dispatch<SetStateAction<{ x: number; y: number }>>;
};

export type WorkspaceBackgroundActions = {
  commitTextEdit: () => void;
  createTextAt: (x: number, y: number) => void;
  createPeerAt: (x: number, y: number) => void;
  createObstacleAt: (x: number, y: number) => void;
  createMoveStep: (movePeerId: string, x: number, y: number) => void;
  onClearSelection: () => void;
  showPlacementHint: () => void;
  scheduleHintRestore: (mode: ToolbarPlacementMode) => void;
};

export type WorkspaceBackgroundHandlers = {
  handleBackgroundPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  handleBackgroundPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleBackgroundPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
};
