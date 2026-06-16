import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { Coordinate } from "@/shared/types/model/base";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { RoutingModule } from "../module";

export type Peer = {
  id: UUID;
  name: string;
  active: boolean;
  configuration: PeerConfiguration;
  coordinates: Coordinate;
  range: number;
  protocol: RoutingProtocol;
  module: RoutingModule;
};
