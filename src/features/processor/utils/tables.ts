import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { RoutingStructureType } from "../types/module";
import { RoutingStructure } from "../types/module";
import type {
  AodvPeerTables,
  BatmanPeerTables,
  DsdvPeerTables,
  DsrPeerTables,
  OlsrPeerTables,
  ProtocolTables,
} from "../types/peerTables";

export const buildProtocolTables = (
  protocol: RoutingProtocol,
  structures: RoutingStructureType,
): ProtocolTables => {
  switch (protocol) {
    case RoutingProtocol.BATMAN: {
      return {
        protocol,
        originatorTable: structures[RoutingStructure.BatmanOriginatorTable] ?? [],
        neighboursList: structures[RoutingStructure.BatmanNeighboursList] ?? [],
      } satisfies BatmanPeerTables;
    }
    case RoutingProtocol.DSDV: {
      return {
        protocol,
        routingTable: structures[RoutingStructure.DsdvRoutingTable] ?? [],
      } satisfies DsdvPeerTables;
    }
    case RoutingProtocol.AODV: {
      return {
        protocol,
        routingTable: structures[RoutingStructure.AodvRoutingTable] ?? [],
      } satisfies AodvPeerTables;
    }
    case RoutingProtocol.DSR: {
      return {
        protocol,
        routingCache: structures[RoutingStructure.DsrRoutingCache] ?? [],
        routeRequestTable: structures[RoutingStructure.DsrRouteRequestTable] ?? [],
      } satisfies DsrPeerTables;
    }
    case RoutingProtocol.OLSR: {
      return {
        protocol,
        neighbourSet: structures[RoutingStructure.OlsrNeighbourSet] ?? [],
        twoHopNeighbourSet: structures[RoutingStructure.OlsrTwoHopNeighbourSet] ?? [],
        mprSet: structures[RoutingStructure.OlsrMultipointRelaySet] ?? [],
        selectorSet: structures[RoutingStructure.OlsrSelectorSet] ?? [],
        topologySet: structures[RoutingStructure.OlsrTopologySet] ?? [],
        routingTable: structures[RoutingStructure.OlsrRoutingTable] ?? [],
      } satisfies OlsrPeerTables;
    }
    default: {
      throw new Error(`Unknown protocol: ${String(protocol)}`);
    }
  }
};
