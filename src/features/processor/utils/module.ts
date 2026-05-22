import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { EventRecorder } from "../EventRecorder";
import { AodvModule } from "../service/aodv/AodvModule";
import { BatmanModule } from "../service/batman/BatmanModule";
import { DsdvModule } from "../service/dsdv/DsdvModule";
import { DsrModule } from "../service/dsr/DsrModule";
import { OlsrModule } from "../service/olsr/OlsrModule";
import type { RoutingModule } from "../types/module";
import type { NodeWrapper } from "../types/node";

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
