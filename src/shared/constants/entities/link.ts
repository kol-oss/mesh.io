import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import type { LinkEntity } from "@/shared/types/model/links";

// default properties
export const getDefaultLink = (sourceId: UUID, destinationId: UUID): LinkEntity => ({
  id: generateUUID(),
  name: "Link",
  type: EntityType.Link,
  locked: false,
  sourcePeerId: sourceId,
  destinationPeerId: destinationId,
  enabled: true,
});
