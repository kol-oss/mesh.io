import { EntityType } from "@/shared/types/model/entities";

const ENTITY_TYPE_NAMES: Record<EntityType, string> = {
  [EntityType.Peer]: "Peer",
  [EntityType.Link]: "Link",
  [EntityType.Obstacle]: "Obstacle",
};

export const getEntityTypeName = (type: EntityType) => ENTITY_TYPE_NAMES[type];
