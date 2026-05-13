import { ActionMode } from "./action";
import { EntityType } from "@/shared/types/model/entities";

export enum DragEntityType {
  Peer = EntityType.Peer,
  Obstacle = EntityType.Obstacle,
  Text = "TEXT",
}

export enum DragMode {
  Move = ActionMode.Move,
  Resize = "RESIZE",
}

export enum ResizeEdge {
  Left = "LEFT",
  Right = "RIGHT",
  Top = "TOP",
  Bottom = "BOTTOM",
}

export enum ConnectionType {
  Mutual = "MUTUAL",
  OneWay = "ONE_WAY",
}
