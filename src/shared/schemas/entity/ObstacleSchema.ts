import { OBSTACLE_MIN_HEIGHT, OBSTACLE_MIN_WIDTH } from "@/shared/constants/entities/obstacle";
import { EntityType } from "@/shared/types/model/entities";
import { z } from "zod";
import { BaseEntitySchema } from "./BaseEntitySchema";
import { CoordinateSchema } from "./CoordinateSchema";

export const ObstacleEntitySchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.Obstacle),
  width: z.number().min(OBSTACLE_MIN_WIDTH),
  height: z.number().min(OBSTACLE_MIN_HEIGHT),
}).merge(CoordinateSchema);

export const ObstaclePropertiesSchema = ObstacleEntitySchema.pick({
  name: true,
  width: true,
  height: true,
});
