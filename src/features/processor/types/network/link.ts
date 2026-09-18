import type { UUID } from "@/shared/types/common/uuid";

export enum LinkType {
  Ranged,
  Wired,
}

export type Link = {
  id: UUID;
  type: LinkType;
  active: boolean;
};
