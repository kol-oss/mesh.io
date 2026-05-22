import type { Packet } from "@/shared/types/common/messages";
import type { AodvRouteRecord } from "./protocols/aodv";
import type { BatmanNeighbourRecord, BatmanRouteRecord } from "./protocols/batman";
import type { DsdvRouteRecord } from "./protocols/dsdv";
import type { DsrRouteRecord } from "./protocols/dsr";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "./protocols/olsr";

export interface RoutingModule {
  read(message: unknown): boolean;
  send(packet: Packet): boolean;
  refresh(): void;
  tick(): void;
}

export enum RoutingStructure {
  BatmanOriginatorTable = "BATMAN_ORIGINATOR_TABLE",
  BatmanNeighboursList = "BATMAN_NEIGHBOURS_LIST",
  DsdvRoutingTable = "DSDV_ROUTING_TABLE",
  AodvRoutingTable = "AODV_ROUTING_TABLE",
  DsrRoutingTable = "DSR_ROUTING_TABLE",
  OlsrNeighbourTable = "OLSR_NEIGHBOUR_TABLE",
  OlsrTwoHopTable = "OLSR_TWO_HOP_TABLE",
  OlsrSelectorTable = "OLSR_SELECTOR_TABLE",
  OlsrTopologyTable = "OLSR_TOPOLOGY_TABLE",
  OlsrRoutingTable = "OLSR_ROUTING_TABLE",
}

export type RoutingStructureType = {
  [RoutingStructure.BatmanOriginatorTable]: BatmanRouteRecord[];
  [RoutingStructure.BatmanNeighboursList]: BatmanNeighbourRecord[];
  [RoutingStructure.DsdvRoutingTable]: DsdvRouteRecord[];
  [RoutingStructure.AodvRoutingTable]: AodvRouteRecord[];
  [RoutingStructure.DsrRoutingTable]: DsrRouteRecord[];
  [RoutingStructure.OlsrNeighbourTable]: OlsrNeighbourRecord[];
  [RoutingStructure.OlsrTwoHopTable]: OlsrTwoHopRecord[];
  [RoutingStructure.OlsrSelectorTable]: OlsrSelectorRecord[];
  [RoutingStructure.OlsrTopologyTable]: OlsrTopologyRecord[];
  [RoutingStructure.OlsrRoutingTable]: OlsrRouteRecord[];
};
