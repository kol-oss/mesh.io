import { EntityType, RoutingProtocol } from "./enums";

export type NavigationMenuItem = {
  title: string;
};

export type PeerRoutingProtocol = RoutingProtocol;

export type PeerEntity = {
  id: string;
  name: string;
  type: typeof EntityType.Peer;
  locked?: boolean;
  x: number;
  y: number;
  range: number;
  enabled: boolean;
  protocols: PeerRoutingProtocol[];
  batmanOgmInterval: number;
  batmanPurgeTimeout: number;
};

export type LinkEntity = {
  id: string;
  name: string;
  type: typeof EntityType.Link;
  locked?: boolean;
  sourcePeerId: string | null;
  destinationPeerId: string | null;
  enabled: boolean;
};

export type ObstacleEntity = {
  id: string;
  name: string;
  type: typeof EntityType.Obstacle;
  locked?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type NetworkEntity = PeerEntity | LinkEntity | ObstacleEntity;
