import { type NetworkEntity } from "../types/model/entities";

export const updateEntity = (
  entity: NetworkEntity,
  entities: NetworkEntity[],
  changes: Partial<NetworkEntity>,
): NetworkEntity[] => {
  if (entity.locked) return entities;

  return entities.map((e) => {
    if (e.id !== entity.id) {
      return e;
    }
    return { ...e, ...changes } as NetworkEntity;
  });
};
