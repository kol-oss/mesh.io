import { ConnectionType, DragEntityType, DragMode, ResizeEdge } from "./enums";

export type DragState = {
  entityId: string;
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

export type ObstacleResizeEdge = ResizeEdge;

export type Connection =
  | {
      type: typeof ConnectionType.Mutual;
      sourceId: string;
      targetId: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
    }
  | {
      type: typeof ConnectionType.OneWay;
      sourceId: string;
      targetId: string;
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
  peerId: string;
  enabled: boolean;
  selected: boolean;
  path: string;
};
