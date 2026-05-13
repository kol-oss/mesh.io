import { ActionMode } from "./actionmode";
import { EntityType } from "./entitytype";

export const DragEntityType = {
  Peer: EntityType.Peer,
  Obstacle: EntityType.Obstacle,
  Text: "TEXT",
} as const;

export type DragEntityType = (typeof DragEntityType)[keyof typeof DragEntityType];

export const DragMode = {
  Move: ActionMode.Move,
  Resize: "resize",
} as const;

export type DragMode = (typeof DragMode)[keyof typeof DragMode];

export const ResizeEdge = {
  Left: "left",
  Right: "right",
  Top: "top",
  Bottom: "bottom",
} as const;

export type ResizeEdge = (typeof ResizeEdge)[keyof typeof ResizeEdge];

export const ConnectionType = {
  Mutual: "MUTUAL",
  OneWay: "ONE_WAY",
} as const;

export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType];
