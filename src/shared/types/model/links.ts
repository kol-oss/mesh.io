import type { UUID } from "@/shared/types/common/uuid";
import type { BaseEntity } from "./base";
import { EntityType } from "./entities";

export interface LinkEntity extends BaseEntity {
  type: EntityType.Link;
  sourcePeerId: UUID | null;
  destinationPeerId: UUID | null;
  enabled: boolean;
}
