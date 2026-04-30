import type { PointerEvent as ReactPointerEvent } from "react";

import { SelectionSource } from "../enums";
import type { Connection, ObstacleResizeEdge, RangePolygon } from "./interaction";
import type { ObstacleEntity, PeerEntity } from "../navigation";
import type { WorkspaceTextItem } from "./index";

export type MoveIndicator = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
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

export type WorkspaceSceneProps = {
  centerX: number;
  centerY: number;
  staticLinks: Array<{
    id: string;
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
  texts: WorkspaceTextItem[];
  obstacles: ObstacleEntity[];
  peers: PeerEntity[];
  selectedSource: SelectionSource | null;
  selectedId: string | null;
  hoveredSimulationPeerId: string | null;
  resolvedCreationSelectedEntityId: string | null;
  selectedStepAffectedEntityIds: Set<string>;
  editingTextId: string | null;
  editingTextDraft: string;
  selectedTextId: string | null;
  activeDragEntityId: string | null;
  setEditingTextDraft: (value: string) => void;
  commitTextEdit: () => void;
  cancelTextEdit: () => void;
  handleStaticLinkPointerDown: (linkId: string, event: ReactPointerEvent<SVGLineElement>) => void;
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
    edge: ObstacleResizeEdge,
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => void;
  handlePeerPointerDown: (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPeerHoverChange: (peerId: string | null) => void;
  onMessageAnimationHoverChange: (isHovered: boolean) => void;
  onMessageAnimationInspectRequest: () => void;
};
