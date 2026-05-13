import type { BaseEntity } from "./base";
import { EntityType } from "./entitytype";
import type { UUID } from "./uuid";

export interface LinkEntity extends BaseEntity {
  type: typeof EntityType.Link;
  sourcePeerId: UUID | null;
  destinationPeerId: UUID | null;
  enabled: boolean;
}
