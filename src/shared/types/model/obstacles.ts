import type { BaseEntity, Coordinate } from "./base";
import { EntityType } from "./entities";

export interface ObstacleEntity extends BaseEntity, Coordinate {
  type: EntityType.Obstacle;
  width: number;
  height: number;
}
