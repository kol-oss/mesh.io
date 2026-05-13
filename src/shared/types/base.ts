import type { UUID } from "./uuid";

export interface BaseEntity {
  id: UUID;
  name: string;
  locked?: boolean;
}

export interface Coordinate {
  x: number;
  y: number;
}
