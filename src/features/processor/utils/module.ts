import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { EventRecorder } from "../EventRecorder";
import { AodvModule } from "../service/aodv/AodvModule";
import { BatmanModule } from "../service/batman/BatmanModule";
import { DsdvModule } from "../service/dsdv/DsdvModule";
import { DsrModule } from "../service/dsr/DsrModule";
import { OlsrModule } from "../service/olsr/OlsrModule";
import type { NodeWrapper } from "../types/node";
import { RoutingStructure, type RoutingModule, type RoutingStructureType } from "../types/routing";

export const MODULE_FACTORY_BY_PROTOCOL: Map<
  RoutingProtocol,
  (node: NodeWrapper, eventRecorder: EventRecorder) => RoutingModule
> = new Map<RoutingProtocol, (node: NodeWrapper, eventRecorder: EventRecorder) => RoutingModule>([
  [RoutingProtocol.BATMAN, (node, eventRecorder) => new BatmanModule(node, eventRecorder)],
  [RoutingProtocol.DSDV, (node, eventRecorder) => new DsdvModule(node, eventRecorder)],
  [RoutingProtocol.AODV, (node, eventRecorder) => new AodvModule(node, eventRecorder)],
  [RoutingProtocol.DSR, (node, eventRecorder) => new DsrModule(node, eventRecorder)],
  [RoutingProtocol.OLSR, (node, eventRecorder) => new OlsrModule(node, eventRecorder)],
]);

export const getStructuresByProtocol = (
  protocol: RoutingProtocol,
  module: RoutingModule,
): RoutingStructureType => {
  const result: RoutingStructureType = {} as RoutingStructureType;
  if (protocol == RoutingProtocol.BATMAN) {
    const batmanModule = module as BatmanModule;

    result[RoutingStructure.BatmanOriginatorTable] = batmanModule.getOriginatorTable();
    result[RoutingStructure.BatmanNeighboursList] = batmanModule.getNeighboursList();
  } else if (protocol == RoutingProtocol.DSDV) {
    const dsdvModule = module as DsdvModule;

    result[RoutingStructure.DsdvRoutingTable] = dsdvModule.getRoutes();
  } else if (protocol == RoutingProtocol.AODV) {
    const aodvModule = module as AodvModule;

    result[RoutingStructure.AodvRoutingTable] = aodvModule.getRoutes();
  } else if (protocol == RoutingProtocol.OLSR) {
    const olsrModule = module as OlsrModule;

    result[RoutingStructure.OlsrNeighbourTable] = olsrModule.getNeighbourTable();
    result[RoutingStructure.OlsrTopologyTable] = olsrModule.getTopologyTable();
    result[RoutingStructure.OlsrTwoHopTable] = olsrModule.getTwoHopTable();
    result[RoutingStructure.OlsrSelectorTable] = olsrModule.getSelectorTable();
    result[RoutingStructure.OlsrRoutingTable] = olsrModule.getRoutes();
  } else if (protocol == RoutingProtocol.DSR) {
    const dsrModule = module as DsrModule;

    result[RoutingStructure.DsrRoutingTable] = dsrModule.getRoutes();
  }

  return result;
};
