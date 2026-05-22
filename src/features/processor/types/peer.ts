import type { AodvRouteRecord } from "@/features/processor/types/protocols/aodv";
import type {
  BatmanNeighbourRecord,
  BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman";
import type { DsdvRouteRecord } from "@/features/processor/types/protocols/dsdv";
import type { DsrRouteRecord } from "@/features/processor/types/protocols/dsr";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "@/features/processor/types/protocols/olsr";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { RoutingModule } from "./module";

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

export interface Node {
  readonly id: UUID;
  readonly name: string;
  isActive(): boolean;
  supports(protocol: RoutingProtocol): boolean;
  getModule(protocol: RoutingProtocol): RoutingModule | null;
  getNeighbour(peerId: UUID): Node | null;
  getNeighbours(): Node[];
  getRangedNeighbours(): Node[];
  isLinkedNeighbour(peerId: UUID): boolean;
  isRangedNeighbour(peerId: UUID): boolean;
  getEntity(): PeerEntity;
  getRoutingStructures(): Readonly<RoutingStructuresMap>;
  getConfiguration(): PeerConfiguration;
}
