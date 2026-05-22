import type { AodvRouteRecord } from "@/features/processor/types/aodv";
import type { BatmanNeighbourRecord, BatmanRouteRecord } from "@/features/processor/types/batman";
import type { DsdvRouteRecord } from "@/features/processor/types/dsdv";
import type { DsrRouteRecord } from "@/features/processor/types/dsr";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "@/features/processor/types/olsr";
import type { Packet } from "@/shared/types/common/messages";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { Snapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";

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
  getConfiguration(): PeerConfiguration;
}

export interface Network {
  getPeer(peerId: UUID): PeerNode | null;
  getPeers(): PeerNode[];
  refreshConnectivity(): void;
  tickModules(): void;
  snapshot(tick: number): Snapshot;
  exportEntities(): NetworkEntity[];
}
