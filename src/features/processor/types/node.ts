import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { RoutingModule, RoutingStructureType } from "./routing";

export interface PeerWrapper {
  readonly id: UUID;
  getEntity(): PeerEntity;
  getProtocol(): RoutingProtocol;
  getConfiguration(): PeerConfiguration;
  isActive(): boolean;
}

export interface NeighbourWrapper {
  getNeighbour(peerId: UUID): NodeWrapper | null;
  getNeighbours(): NodeWrapper[];
  getRangedNeighbours(): NodeWrapper[];
  isLinkedNeighbour(peerId: UUID): boolean;
  isRangedNeighbour(peerId: UUID): boolean;
}

export interface RoutingWrapper {
  supports(protocol: RoutingProtocol): boolean;
  getModule(protocol: RoutingProtocol): RoutingModule | null;
  getRoutingStructures(): RoutingStructureType;
}

export interface NodeWrapper extends PeerWrapper, NeighbourWrapper, RoutingWrapper {}
