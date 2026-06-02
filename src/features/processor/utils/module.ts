import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { EventRecorder } from "../EventRecorder";
import { AodvModule } from "../module/aodv/AodvModule";
import { BatmanModule } from "../module/batman/BatmanModule";
import { DsdvModule } from "../module/dsdv/DsdvModule";
import { DsrModule } from "../module/dsr/DsrModule.ts";
import { OlsrModule } from "../module/olsr/OlsrModule";
import type { NetworkGraph } from "../network/NetworkGraph";
import { type RoutingModule } from "../types/module";

export const createModule = (
  peer: PeerEntity,
  graph: NetworkGraph,
  eventRecorder: EventRecorder,
): RoutingModule => {
  const { id, protocol } = peer;
  if (protocol === RoutingProtocol.BATMAN) {
    return new BatmanModule(id, graph, eventRecorder);
  } else if (protocol === RoutingProtocol.DSDV) {
    return new DsdvModule(id, graph, eventRecorder);
  } else if (protocol === RoutingProtocol.AODV) {
    return new AodvModule(id, graph, eventRecorder);
  } else if (protocol === RoutingProtocol.OLSR) {
    return new OlsrModule(id, graph, eventRecorder);
  } else if (protocol === RoutingProtocol.DSR) {
    return new DsrModule(id, graph, eventRecorder);
  }

  throw new Error(`Protocol must be specified to create a module for peer ${id}`);
};
