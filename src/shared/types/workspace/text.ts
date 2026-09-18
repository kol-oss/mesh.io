import type { UUID } from "@/shared/types/common/uuid";

export type TextItem = {
  id: UUID;
  text: string;
  x: number;
  y: number;
};
