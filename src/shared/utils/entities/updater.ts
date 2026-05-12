import type { NetworkEntity } from "../../types/entities";
import type { UUID } from "../../types/uuid";

export function createEntityUpdater<T extends NetworkEntity>(
  entities: NetworkEntity[],
  entityId: UUID,
  entityType: T["type"],
  isLocked: boolean,
  setEntities: (entities: NetworkEntity[]) => void,
) {
  return (changes: Partial<T>) => {
    if (isLocked) return;
    const updated = entities.map((entity) =>
      entity.id === entityId && entity.type === entityType ? { ...entity, ...changes } : entity,
    );
    setEntities(updated);
  };
}

export function createMultiEntityUpdater<T extends NetworkEntity>(
  entities: NetworkEntity[],
  filterFn: (e: NetworkEntity) => e is T,
  isLocked: boolean,
  setEntities: (entities: NetworkEntity[]) => void,
) {
  return (changes: Partial<T>) => {
    if (isLocked) return;
    const updated = entities.map((entity) =>
      filterFn(entity) ? { ...entity, ...changes } : entity,
    );
    setEntities(updated);
  };
}
