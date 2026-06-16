import type { Message, Packet } from "@/shared/types/common/messages";
import type { RefreshAction } from "@/shared/types/model/steps";
import type { AodvRouteRecord } from "./protocols/aodv";
import type { BatmanNeighbourRecord, BatmanRouteRecord } from "./protocols/batman";
import type { DsdvRouteRecord } from "./protocols/dsdv";
import type { DsrPacket, DsrRouteRecord, DsrRouteRequestTableRecord } from "./protocols/dsr";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "./protocols/olsr";
import type { UUID } from "@/shared/types/common/uuid.ts";

export interface RoutingModule {
  read(message: Message): boolean;
  send(packet: Packet | DsrPacket): boolean;
  refresh(action?: RefreshAction): void;
}

export enum RoutingStructure {
  BatmanOriginatorTable = "BATMAN_ORIGINATOR_TABLE",
  BatmanNeighboursList = "BATMAN_NEIGHBOURS_LIST",
  DsdvRoutingTable = "DSDV_ROUTING_TABLE",
  AodvRoutingTable = "AODV_ROUTING_TABLE",
  DsrRoutingCache = "DSR_ROUTING_CACHE",
  DsrRouteRequestTable = "DSR_ROUTE_REQUEST_TABLE",
  OlsrNeighbourSet = "OLSR_NEIGHBOUR_SET",
  OlsrTwoHopNeighbourSet = "OLSR_TWO_HOP_SET",
  OlsrMultipointRelaySet = "OLSR_MPR_SET",
  OlsrSelectorSet = "OLSR_SELECTOR_SET",
  OlsrTopologySet = "OLSR_TOPOLOGY_SET",
  OlsrRoutingTable = "OLSR_ROUTING_TABLE",
}

export type RoutingStructureType = {
  [RoutingStructure.BatmanOriginatorTable]: BatmanRouteRecord[];
  [RoutingStructure.BatmanNeighboursList]: BatmanNeighbourRecord[];
  [RoutingStructure.DsdvRoutingTable]: DsdvRouteRecord[];
  [RoutingStructure.AodvRoutingTable]: AodvRouteRecord[];
  [RoutingStructure.DsrRoutingCache]: DsrRouteRecord[];
  [RoutingStructure.DsrRouteRequestTable]: DsrRouteRequestTableRecord[];
  [RoutingStructure.OlsrNeighbourSet]: OlsrNeighbourRecord[];
  [RoutingStructure.OlsrTwoHopNeighbourSet]: OlsrTwoHopRecord[];
  [RoutingStructure.OlsrMultipointRelaySet]: UUID[];
  [RoutingStructure.OlsrSelectorSet]: OlsrSelectorRecord[];
  [RoutingStructure.OlsrTopologySet]: OlsrTopologyRecord[];
  [RoutingStructure.OlsrRoutingTable]: OlsrRouteRecord[];
};
