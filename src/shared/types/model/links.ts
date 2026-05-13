import type { BaseEntity } from "./base";
import { EntityType } from "./entities";
import type { UUID } from "@/shared/types/common/uuid";

export interface LinkEntity extends BaseEntity {
  type: EntityType.Link;
  sourcePeerId: UUID | null;
  destinationPeerId: UUID | null;
  enabled: boolean;
}
