export type DragState = {
  entityId: string;
  entityType: "PEER" | "OBSTACLE" | "TEXT";
  mode: "move" | "resize";
  resizeEdge?: "left" | "right" | "top" | "bottom";
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth?: number;
  startHeight?: number;
};

export type ObstacleResizeEdge = "left" | "right" | "top" | "bottom";

export type Connection =
  | {
      type: "MUTUAL";
      sourceId: string;
      targetId: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
    }
  | {
      type: "ONE_WAY";
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
