import { generateUUID } from "@/shared/types/common/uuid";
import { EntityType, type ObstacleEntity } from "@/shared/types/model/entities";

// validation
export const OBSTACLE_MIN_WIDTH = 1;
export const OBSTACLE_MIN_HEIGHT = 1;

// default properties
export const getDefaultObstacle = (x: number, y: number): ObstacleEntity => ({
  id: generateUUID(),
  name: "Obstacle",
  type: EntityType.Obstacle,
  locked: false,
  x,
  y,
  width: 100,
  height: 50,
});
