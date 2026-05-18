import { Link2, Radio, SquareSlash, type LucideIcon } from "lucide-react";
import { EntityType } from "../types/model/entities";

export const ENTITY_TYPE_ICONS: Record<EntityType, LucideIcon> = {
  [EntityType.Peer]: Radio,
  [EntityType.Link]: Link2,
  [EntityType.Obstacle]: SquareSlash,
};
