import type { BaseEntity, Coordinate } from "./base";
import type { DaemonConfiguration } from "./configurations";
import { EntityType } from "./entitytype";
import type { RoutingProtocol } from "./protocols";

export interface PeerEntity extends BaseEntity, Coordinate, DaemonConfiguration {
  type: typeof EntityType.Peer;
  range: number;
  enabled: boolean;
  protocols: RoutingProtocol[];
}
