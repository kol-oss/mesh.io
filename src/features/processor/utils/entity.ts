import type { EntityType, NetworkEntity } from "@/shared/types/model/entities";

// filters entities by type
export const filterEntities = <T extends NetworkEntity>(
  entities: NetworkEntity[],
  type: EntityType,
): T[] => {
  return entities.filter((entity) => entity.type === type) as T[];
};
