import type { PointerEvent as ReactPointerEvent } from "react";

import { SelectionType } from "../view/selection";
import type { Connection, RangePolygon } from "./interaction";
import type { ResizeEdge } from "../interaction";
import type { ObstacleEntity, PeerEntity } from "../model/entities";
import type { WorkspaceTextItem } from "./text";
import type { UUID } from "../common/uuid";

export type MoveIndicator = {
  stepId: UUID | null;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  targetRange: number;
  draft: boolean;
};

export type MessageAnimation = {
  key: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  variant: "default" | "route-change" | "dropped";
};

export type MoveStepAnimation = {
  peerId: UUID;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
};

export type ToggleStepAnimation = {
  entityId: UUID;
  entityType: "PEER" | "LINK";
  nextEnabled: boolean;
};

export type WorkspaceSceneProps = {
  centerX: number;
  centerY: number;
  staticLinks: Array<{
    id: UUID;
    enabled: boolean;
    sourceX: number;
    sourceY: number;
    destinationX: number;
    destinationY: number;
  }>;
  connections: Connection[];
  rangePolygons: RangePolygon[];
  moveIndicators: MoveIndicator[];
  messageAnimations: MessageAnimation[];
  moveStepAnimation: MoveStepAnimation | null;
  toggleStepAnimation: ToggleStepAnimation | null;
  texts: WorkspaceTextItem[];
  obstacles: ObstacleEntity[];
  peers: PeerEntity[];
  selectedSource: SelectionType | null;
  selectedId: UUID | null;
  hoveredSimulationPeerId: UUID | null;
  resolvedCreationSelectedEntityId: UUID | null;
  selectedStepAffectedEntityIds: Set<UUID>;
  editingTextId: UUID | null;
  editingTextDraft: string;
  selectedTextId: UUID | null;
  activeDragEntityId: UUID | null;
  setEditingTextDraft: (value: string) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
  handleStaticLinkPointerDown: (linkId: UUID, event: ReactPointerEvent<SVGLineElement>) => void;
  handleTextPointerDown: (item: WorkspaceTextItem, event: ReactPointerEvent<HTMLElement>) => void;
  handleTextDoubleClick: (item: WorkspaceTextItem) => void;
  handleEntityPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleEntityPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  handleObstaclePointerDown: (
    obstacle: ObstacleEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  handleObstacleResizeStart: (
    obstacle: ObstacleEntity,
    edge: ResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handlePeerPointerDown: (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => void;
  handleMoveIndicatorPointerDown: (stepId: UUID, event: ReactPointerEvent<HTMLElement>) => void;
  handleMoveIndicatorPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleMoveIndicatorPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
  onPeerHoverChange: (peerId: UUID | null) => void;
  onMessageAnimationHoverChange: (isHovered: boolean) => void;
  onMessageAnimationInspectRequest: () => void;
};
