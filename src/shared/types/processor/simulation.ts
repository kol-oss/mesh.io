import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity, PeerEntity } from "../model/entities";
import type { Step } from "../model/steps";
import type { AodvRouteRecord } from "./aodv";
import type { BatmanNeighbourRecord, BatmanRouteRecord } from "./batman";
import type { DsdvRouteRecord } from "./dsdv";
import type { Message, MessageType } from "./messages";
import type {
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
} from "./olsr";

export type DsrRouteRequestMessage = {
  kind: MessageType.DsrRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

export type DsrRouteReplyMessage = {
  kind: MessageType.DsrRouteReplyMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

export type DsrRouteErrorMessage = {
  kind: MessageType.DsrRouteErrorMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationPeerId: UUID;
  brokenFromPeerId: UUID;
  brokenToPeerId: UUID;
  salvageCount: number;
  routePeerIds: UUID[];
};

export type DsrRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
  pathPeerIds: UUID[];
};

export type DsrRoutingTableChangeDetails = {
  protocol: typeof RoutingProtocol.DSR;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: DsrRouteRecord | null;
  nextRoute: DsrRouteRecord | null;
  message?: Message;
  reason: string;
};

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
  peers: PeerSnapshot[];
};

export type StepResult = {
  step: Step;
  events: Event[];
  eventSnapshots: Snapshot[];
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
