import type { UUID } from "../uuid";

export type WorkspaceTextItem = {
  id: UUID;
  text: string;
  x: number;
  y: number;
};

export type { WorkspacePoint, WorkspaceSize } from "./shared";
