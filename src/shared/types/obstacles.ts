import type { BaseEntity, Coordinate } from "./base";
import { EntityType } from "./entitytype";

export interface ObstacleEntity extends BaseEntity, Coordinate {
  type: typeof EntityType.Obstacle;
  width: number;
  height: number;
}
