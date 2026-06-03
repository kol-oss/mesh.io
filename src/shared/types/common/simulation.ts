import type { AodvRouteRecord } from "@/features/processor/types/protocols/aodv.ts";
import type {
  BatmanNeighbourRecord,
  BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman.ts";
import type { DsdvRouteRecord } from "@/features/processor/types/protocols/dsdv.ts";
import type {
  DsrRouteRecord,
  DsrRouteRequestTableRecord,
} from "@/features/processor/types/protocols/dsr.ts";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "@/features/processor/types/protocols/olsr.ts";
import type { NetworkEntity, PeerEntity } from "../model/entities";
import type { Step } from "../model/steps";
import type { Event } from "./events";

export type PeerSnapshot = PeerEntity & {
  batmanRoutingTable: BatmanRouteRecord[];
  batmanNeighboursTable: BatmanNeighbourRecord[];
  dsdvRoutingTable: DsdvRouteRecord[];
  aodvRoutingTable: AodvRouteRecord[];
  dsrRoutingTable: DsrRouteRecord[];
  dsrRouteRequestTable: DsrRouteRequestTableRecord[];
  olsrNeighbourSet: OlsrNeighbourRecord[];
  olsrTwoHopNeighbourSet: OlsrTwoHopRecord[];
  olsrMprSet: UUID[];
  olsrSelectorSet: OlsrSelectorRecord[];
  olsrTopologySet: OlsrTopologyRecord[];
  olsrRoutingTable: OlsrRouteRecord[];
};

export type Snapshot = {
  tick: number;
  entities: NetworkEntity[];
  peers: PeerEntity[];
};

export type StepResult = {
  step: Step;
  events: Event[];
  snapshot: Snapshot;
};

export type SimulationInput = {
  entities: NetworkEntity[];
  steps: Step[];
};

export type SimulationResult = {
  events: Event[];
  steps: Step[];
  stepResults: StepResult[];
};
