import type { EntityType } from "@/shared/types/model/entities";

export type ToggleStatusResult = {
  entityType: EntityType;
  previousEnabled: boolean;
  nextEnabled: boolean;
} | null;
