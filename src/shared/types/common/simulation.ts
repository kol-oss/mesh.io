import type { AodvRouteRecord } from "../../../features/processor/types/protocols/aodv";
import type {
  BatmanNeighbourRecord,
  BatmanRouteRecord,
} from "../../../features/processor/types/protocols/batman";
import type { DsdvRouteRecord } from "../../../features/processor/types/protocols/dsdv";
import type { DsrRouteRecord } from "../../../features/processor/types/protocols/dsr";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "../../../features/processor/types/protocols/olsr";
import type { NetworkEntity, PeerEntity } from "../model/entities";
import type { Step } from "../model/steps";
import type { Event } from "./events";

export type PeerSnapshot = PeerEntity & {
  batmanRoutingTable: BatmanRouteRecord[];
  batmanNeighboursTable: BatmanNeighbourRecord[];
  dsdvRoutingTable: DsdvRouteRecord[];
  aodvRoutingTable: AodvRouteRecord[];
  dsrRoutingTable: DsrRouteRecord[];
  olsrNeighbourTable: OlsrNeighbourRecord[];
  olsrTwoHopTable: OlsrTwoHopRecord[];
  olsrSelectorTable: OlsrSelectorRecord[];
  olsrTopologyTable: OlsrTopologyRecord[];
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

export type SimulationPlaybackState = {
  result: SimulationResult | null;
  currentStepIndex: number;
  currentEventIndex: number;
  isRunning: boolean;
};
