import { ConnectionType, DragEntityType, DragMode, ResizeEdge } from "../interaction";
import type { UUID } from "../common/uuid";

export type DragState = {
  entityId: UUID;
  entityType: DragEntityType;
  mode: DragMode;
  resizeEdge?: ResizeEdge;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth?: number;
  startHeight?: number;
};

export type Connection =
  | {
      type: typeof ConnectionType.Mutual;
      sourceId: UUID;
      targetId: UUID;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
    }
  | {
      type: typeof ConnectionType.OneWay;
      sourceId: UUID;
      targetId: UUID;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
    };

export type ObstacleBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type RangePolygon = {
  peerId: UUID;
  enabled: boolean;
  selected: boolean;
  path: string;
};
