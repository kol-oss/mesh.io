import { EntityType, RoutingProtocol } from "../enums";

export type NavigationMenuItem = {
  title: string;
};

export type PeerRoutingProtocol = RoutingProtocol;

export type BaseEntity = {
  id: string;
  name: string;
  locked?: boolean;
};

export type PeerEntity = BaseEntity & {
  type: typeof EntityType.Peer;
  x: number;
  y: number;
  range: number;
  enabled: boolean;
  protocols: PeerRoutingProtocol[];
  batmanOgmInterval: number;
  batmanPurgeTimeout: number;
};

export type LinkEntity = BaseEntity & {
  type: typeof EntityType.Link;
  sourcePeerId: string | null;
  destinationPeerId: string | null;
  enabled: boolean;
};

export type ObstacleEntity = BaseEntity & {
  type: typeof EntityType.Obstacle;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NetworkEntity = PeerEntity | LinkEntity | ObstacleEntity;

export const isPeerEntity = (entity: NetworkEntity): entity is PeerEntity => {
  return entity.type === EntityType.Peer;
};

export const isLinkEntity = (entity: NetworkEntity): entity is LinkEntity => {
  return entity.type === EntityType.Link;
};

export const isObstacleEntity = (entity: NetworkEntity): entity is ObstacleEntity => {
  return entity.type === EntityType.Obstacle;
};
