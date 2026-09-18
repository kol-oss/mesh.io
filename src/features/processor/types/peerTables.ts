import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { AodvRouteRecord } from "./protocols/aodv";
import type { BatmanNeighbourRecord, BatmanRouteRecord } from "./protocols/batman";
import type { DsdvRouteRecord } from "./protocols/dsdv";
import type { DsrRouteRecord, DsrRouteRequestTableRecord } from "./protocols/dsr";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "./protocols/olsr";

export type BatmanPeerTables = {
  protocol: typeof RoutingProtocol.BATMAN;
  originatorTable: BatmanRouteRecord[];
  neighboursList: BatmanNeighbourRecord[];
};

export type DsdvPeerTables = {
  protocol: typeof RoutingProtocol.DSDV;
  routingTable: DsdvRouteRecord[];
};

export type AodvPeerTables = {
  protocol: typeof RoutingProtocol.AODV;
  routingTable: AodvRouteRecord[];
};

export type DsrPeerTables = {
  protocol: typeof RoutingProtocol.DSR;
  routingCache: DsrRouteRecord[];
  routeRequestTable: DsrRouteRequestTableRecord[];
};

export type OlsrPeerTables = {
  protocol: typeof RoutingProtocol.OLSR;
  neighbourSet: OlsrNeighbourRecord[];
  twoHopNeighbourSet: OlsrTwoHopRecord[];
  mprSet: UUID[];
  selectorSet: OlsrSelectorRecord[];
  topologySet: OlsrTopologyRecord[];
  routingTable: OlsrRouteRecord[];
};

export type ProtocolTables =
  | BatmanPeerTables
  | DsdvPeerTables
  | AodvPeerTables
  | DsrPeerTables
  | OlsrPeerTables;
