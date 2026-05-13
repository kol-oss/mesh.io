import type { UUID } from "../common/uuid";

export type WorkspaceTextItem = {
  id: UUID;
  text: string;
  x: number;
  y: number;
};
