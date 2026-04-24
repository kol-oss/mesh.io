export type NavigationMenuItem = {
  title: string;
};

export type PeerRoutingProtocol = "HWMP" | "BATMAN" | "OLSR" | "AODV" | "DSR";

export type PeerEntity = {
  id: string;
  name: string;
  type: "PEER";
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
  type: "LINK";
  locked?: boolean;
  sourcePeerId: string | null;
  destinationPeerId: string | null;
  enabled: boolean;
};

export type ObstacleEntity = {
  id: string;
  name: string;
  type: "OBSTACLE";
  locked?: boolean;
};

export type NetworkEntity = PeerEntity | LinkEntity | ObstacleEntity;
