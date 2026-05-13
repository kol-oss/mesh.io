import type { BaseEntity } from "./base";
import type { LinkEntity } from "./links";
import type { ObstacleEntity } from "./obstacles";
import type { PeerEntity } from "./peers";

export enum EntityType {
  Peer = "PEER",
  Link = "LINK",
  Obstacle = "OBSTACLE",
}

export type { BaseEntity };
export type { PeerEntity } from "./peers";
export type { LinkEntity } from "./links";
export type { ObstacleEntity } from "./obstacles";

export type NetworkEntity = PeerEntity | LinkEntity | ObstacleEntity;
