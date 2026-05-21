import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
import type { BatmanNeighbourRecord, BatmanRouteRecord } from "@/shared/types/processor/batman";
import type { DsdvRouteRecord } from "@/shared/types/processor/dsdv";
import type { Packet } from "@/shared/types/processor/messages";
import type {
  AodvRouteRecord,
  DsrRouteRecord,
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
  Snapshot,
} from "@/shared/types/processor/simulation";

export interface RoutingModule {
  read(message: unknown): boolean;
  send(packet: Packet): boolean;
  refresh(): void;
  tick(): void;
}

export const RoutingStructure = {
  BatmanRoutingTable: "batmanRoutingTable",
  BatmanNeighboursTable: "batmanNeighboursTable",
  DsdvRoutingTable: "dsdvRoutingTable",
  AodvRoutingTable: "aodvRoutingTable",
  DsrRoutingTable: "dsrRoutingTable",
  OlsrNeighbourTable: "olsrNeighbourTable",
  OlsrTwoHopTable: "olsrTwoHopTable",
  OlsrSelectorTable: "olsrSelectorTable",
  OlsrTopologyTable: "olsrTopologyTable",
  OlsrRoutingTable: "olsrRoutingTable",
} as const;

export type RoutingStructure = (typeof RoutingStructure)[keyof typeof RoutingStructure];

export type RoutingStructureRecordsByType = {
  [RoutingStructure.BatmanRoutingTable]: BatmanRouteRecord[];
  [RoutingStructure.BatmanNeighboursTable]: BatmanNeighbourRecord[];
  [RoutingStructure.DsdvRoutingTable]: DsdvRouteRecord[];
  [RoutingStructure.AodvRoutingTable]: AodvRouteRecord[];
  [RoutingStructure.DsrRoutingTable]: DsrRouteRecord[];
  [RoutingStructure.OlsrNeighbourTable]: OlsrNeighbourRecord[];
  [RoutingStructure.OlsrTwoHopTable]: OlsrTwoHopRecord[];
  [RoutingStructure.OlsrSelectorTable]: OlsrSelectorRecord[];
  [RoutingStructure.OlsrTopologyTable]: OlsrTopologyRecord[];
  [RoutingStructure.OlsrRoutingTable]: OlsrRouteRecord[];
};

export type RoutingStructuresMap = Partial<RoutingStructureRecordsByType>;

export interface PeerNode {
  readonly id: UUID;
  readonly name: string;
  isActive(): boolean;
  supports(protocol: RoutingProtocol): boolean;
  getModule(protocol: RoutingProtocol): RoutingModule | null;
  getNeighbour(peerId: UUID): PeerNode | null;
  getNeighbours(): PeerNode[];
  getRangedNeighbours(): PeerNode[];
  isLinkedNeighbour(peerId: UUID): boolean;
  isRangedNeighbour(peerId: UUID): boolean;
  getEntity(): PeerEntity;
  getRoutingStructures(): Readonly<RoutingStructuresMap>;
}

export interface Network {
  getPeer(peerId: UUID): PeerNode | null;
  getPeers(): PeerNode[];
  refreshConnectivity(): void;
  tickModules(): void;
  snapshot(tick: number): Snapshot;
  exportEntities(): NetworkEntity[];
}
