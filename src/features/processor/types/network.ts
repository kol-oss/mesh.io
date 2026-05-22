import type { Snapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { EntityType, NetworkEntity } from "@/shared/types/model/entities";
import type { Node } from "./peer";

export type ToggleStatusResult = {
  entityType: EntityType;
  previousEnabled: boolean;
  nextEnabled: boolean;
} | null;

export interface EntityManager {
  getPeer(id: UUID): Node | null;
  getAllPeers(): Node[];
}

export interface EventManager {
  refresh(): void;
  tick(): void;
  move(id: UUID, x: number, y: number): void;
  toggleStatus(entityId: UUID): ToggleStatusResult;
}

export interface StateManager {
  snapshot(tick: number): Snapshot;
  export(): NetworkEntity[];
}
