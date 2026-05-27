import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { BaseEntity, Coordinate } from "./base";
import type { PeerConfiguration } from "./configurations";
import { EntityType } from "./entities";

export interface PeerEntity extends BaseEntity, Coordinate {
  type: EntityType.Peer;
  range: number;
  enabled: boolean;
  protocol: RoutingProtocol;
  configuration: PeerConfiguration;
}
