import type { NetworkEntity, PeerEntity } from "./entities";
import { RoutingProtocol } from "./enums";
import type { WorkflowStep } from "./steps";
import type { UUID } from "./uuid";

export const SimulationEventType = {
  SystemMessageBroadcast: "SYSTEM_MESSAGE_BROADCAST",
  SystemRouteSelected: "SYSTEM_ROUTE_SELECTED",
  SystemThroughputCalculated: "SYSTEM_THROUGHPUT_CALCULATED",
  SystemMessageDropped: "SYSTEM_MESSAGE_DROPPED",
  SystemPeerMoved: "SYSTEM_PEER_MOVED",
  SystemEntityStatusChanged: "SYSTEM_ENTITY_STATUS_CHANGED",
  RoutingTableGet: "ROUTING_TABLE_GET",
  RoutingTableInsert: "ROUTING_TABLE_INSERT",
  RoutingTableUpdate: "ROUTING_TABLE_UPDATE",
  RoutingTableRemove: "ROUTING_TABLE_REMOVE",
  SimulationStepStart: "SIMULATION_STEP_START",
  SimulationStepEnd: "SIMULATION_STEP_END",
} as const;

export type SimulationEventType = (typeof SimulationEventType)[keyof typeof SimulationEventType];

export const SimulationMessageKind = {
  Packet: "PACKET",
  BatmanOriginatorMessage: "BATMAN_ORIGINATOR_MESSAGE",
  BatmanEchoLocationMessage: "BATMAN_ECHO_LOCATION_MESSAGE",
  DsdvRouteUpdateMessage: "DSDV_ROUTE_UPDATE_MESSAGE",
  AodvRouteRequestMessage: "AODV_ROUTE_REQUEST_MESSAGE",
  AodvRouteReplyMessage: "AODV_ROUTE_REPLY_MESSAGE",
  AodvRouteErrorMessage: "AODV_ROUTE_ERROR_MESSAGE",
  AodvHelloMessage: "AODV_HELLO_MESSAGE",
  OlsrHelloMessage: "OLSR_HELLO_MESSAGE",
  OlsrTcMessage: "OLSR_TC_MESSAGE",
  DsrRouteRequestMessage: "DSR_ROUTE_REQUEST_MESSAGE",
  DsrRouteReplyMessage: "DSR_ROUTE_REPLY_MESSAGE",
  DsrRouteErrorMessage: "DSR_ROUTE_ERROR_MESSAGE",
} as const;

export type SimulationMessageKind =
  (typeof SimulationMessageKind)[keyof typeof SimulationMessageKind];

export type SimulationPacket = {
  kind: typeof SimulationMessageKind.Packet;
  sourcePeerId: UUID | null;
  destinationPeerId: UUID;
  timeToLive: number;
};

export type BatmanOriginatorMessage = {
  kind: typeof SimulationMessageKind.BatmanOriginatorMessage;
  version: number;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  sequence: number;
  timeToLive: number;
  throughput: number;
};

export type BatmanEchoLocationNeighbour = {
  address: string;
};

export const BatmanPacketType = {
  EchoLocationProtocol: "ELP",
} as const;

export type BatmanPacketType = (typeof BatmanPacketType)[keyof typeof BatmanPacketType];

export const QualityWindowBit = {
  Active: "1",
  Inactive: "0",
} as const;

export type QualityWindowBit = (typeof QualityWindowBit)[keyof typeof QualityWindowBit];

export type BatmanEchoLocationMessage = {
  kind: typeof SimulationMessageKind.BatmanEchoLocationMessage;
  packetType: typeof BatmanPacketType.EchoLocationProtocol;
  version: number;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  timeToLive: number;
  numNeighbours: number;
  sequence: number;
  interval: number;
  neighbours: BatmanEchoLocationNeighbour[];
};

export const DsdvUpdateType = {
  FullDump: "FULL_DUMP",
  Incremental: "INCREMENTAL",
} as const;

export type DsdvUpdateType = (typeof DsdvUpdateType)[keyof typeof DsdvUpdateType];

export type DsdvRouteEntryMessage = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  sequenceNumber: number;
  metric: number;
};

export type DsdvRouteUpdateMessage = {
  kind: typeof SimulationMessageKind.DsdvRouteUpdateMessage;
  updateType: DsdvUpdateType;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  hopCount: number;
  entries: DsdvRouteEntryMessage[];
};

export type AodvRouteRequestMessage = {
  kind: typeof SimulationMessageKind.AodvRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationPeerId: UUID;
  requestId: number;
  hopCount: number;
  destinationSequenceNumber: number | null;
  originatorSequenceNumber: number;
};

export type AodvRouteReplyMessage = {
  kind: typeof SimulationMessageKind.AodvRouteReplyMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  destinationPeerId: UUID;
  destinationSequenceNumber: number;
  originatorPeerId: UUID;
  hopCount: number;
  lifetime: number;
  gratuitous: boolean;
};

export type AodvUnreachableDestination = {
  destinationPeerId: UUID;
  sequenceNumber: number;
};

export type AodvRouteErrorMessage = {
  kind: typeof SimulationMessageKind.AodvRouteErrorMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID | null;
  unreachableDestinations: AodvUnreachableDestination[];
  noDelete: boolean;
};

export type AodvHelloMessage = {
  kind: typeof SimulationMessageKind.AodvHelloMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationSequenceNumber: number;
  lifetime: number;
  interval: number;
};

export type OlsrHelloMessage = {
  kind: typeof SimulationMessageKind.OlsrHelloMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  interval: number;
  neighbours: UUID[];
  mprPeerIds: UUID[];
};

export type OlsrTcMessage = {
  kind: typeof SimulationMessageKind.OlsrTcMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  ansn: number;
  timeToLive: number;
  advertisedNeighbours: UUID[];
};

export type DsrRouteRequestMessage = {
  kind: typeof SimulationMessageKind.DsrRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

export type DsrRouteReplyMessage = {
  kind: typeof SimulationMessageKind.DsrRouteReplyMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

export type DsrRouteErrorMessage = {
  kind: typeof SimulationMessageKind.DsrRouteErrorMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationPeerId: UUID;
  brokenFromPeerId: UUID;
  brokenToPeerId: UUID;
  salvageCount: number;
  routePeerIds: UUID[];
};

export type SimulationMessage =
  | SimulationPacket
  | BatmanOriginatorMessage
  | BatmanEchoLocationMessage
  | DsdvRouteUpdateMessage
  | AodvRouteRequestMessage
  | AodvRouteReplyMessage
  | AodvRouteErrorMessage
  | AodvHelloMessage
  | OlsrHelloMessage
  | OlsrTcMessage
  | DsrRouteRequestMessage
  | DsrRouteReplyMessage
  | DsrRouteErrorMessage;

export type BatmanRouteRecord = {
  originatorPeerId: UUID;
  hopPeerId: UUID;
  quality: number;
  qualityWindow: string;
  lastTick: number;
};

export type BatmanNeighbourRecord = {
  neighbourPeerId: UUID;
  quality: number;
  lastTick: number;
  interval: number;
};

export type DsdvRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
};

export type AodvRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
  validSequenceNumber: boolean;
  valid: boolean;
  precursors: UUID[];
};

export type OlsrRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
};

export type DsrRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
  pathPeerIds: UUID[];
};

export type OlsrNeighbourRecord = {
  neighbourPeerId: UUID;
  status: "SYMMETRIC" | "MPR";
  lastUpdateTick: number;
};

export type OlsrTwoHopRecord = {
  destinationPeerId: UUID;
  viaPeerId: UUID;
  lastUpdateTick: number;
};

export type OlsrSelectorRecord = {
  selectorPeerId: UUID;
  lastUpdateTick: number;
};

export type OlsrTopologyRecord = {
  destinationPeerId: UUID;
  lastHopPeerId: UUID;
  sequenceNumber: number;
  lastUpdateTick: number;
};

export type BatmanRoutingTableChangeDetails = {
  protocol: typeof RoutingProtocol.BATMAN;
  originatorPeerId: UUID;
  hopPeerId: UUID;
  previousRoute: BatmanRouteRecord | null;
  nextRoute: BatmanRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type DsdvRoutingTableChangeDetails = {
  protocol: typeof RoutingProtocol.DSDV;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: DsdvRouteRecord | null;
  nextRoute: DsdvRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type AodvRoutingTableChangeDetails = {
  protocol: typeof RoutingProtocol.AODV;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: AodvRouteRecord | null;
  nextRoute: AodvRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type OlsrRoutingTableChangeDetails = {
  protocol: typeof RoutingProtocol.OLSR;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: OlsrRouteRecord | null;
  nextRoute: OlsrRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type DsrRoutingTableChangeDetails = {
  protocol: typeof RoutingProtocol.DSR;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: DsrRouteRecord | null;
  nextRoute: DsrRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type RoutingTableChangeDetails =
  | BatmanRoutingTableChangeDetails
  | DsdvRoutingTableChangeDetails
  | AodvRoutingTableChangeDetails
  | OlsrRoutingTableChangeDetails
  | DsrRoutingTableChangeDetails;

export type BroadcastEventDetails = {
  neighbourPeerIds: UUID[];
  retransmit: boolean;
  message: SimulationMessage;
  note?: string;
};

export type MessageTransferEventDetails = {
  hopPeerId: UUID;
  message: SimulationMessage;
};

export type DroppedEventDetails = {
  message?: SimulationMessage;
  reason: string;
  reasonCode?: "NO_ROUTE" | "SOURCE_UNAVAILABLE";
};

export type ThroughputCalculationEventDetails = {
  message: SimulationMessage;
  reason: string;
  breakdown?: {
    baseThroughput: number;
    baseReferenceThroughput: number;
    receptionRatio: number;
    rawThroughput: number;
    previousEwma: number | null;
    nextEwma: number;
    distance: number;
    distancePenaltyDistance: number;
    distancePenaltyPercent: number;
  };
  ogmSelection?: {
    receivedThroughput: number;
    neighbourThroughput: number;
    selectedThroughput: number;
    isWirelessHop: boolean;
    hopPenaltyPercent: number;
    forwardedThroughput: number;
  };
};

export type RouteSelectedEventDetails = {
  protocol: RoutingProtocol;
  destinationPeerId: UUID;
  selectedRoute:
    | BatmanRouteRecord
    | DsdvRouteRecord
    | AodvRouteRecord
    | OlsrRouteRecord
    | DsrRouteRecord;
  message: SimulationPacket;
};

export type PeerMovedEventDetails = {
  peerId: UUID;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type EntityStatusChangedEventDetails = {
  entityId: UUID;
  entityType: NetworkEntity["type"];
  previousEnabled: boolean;
  nextEnabled: boolean;
};

export type SimulationStepBoundaryDetails = {
  stepId: UUID;
  stepTitle: string;
  stepType: WorkflowStep["type"];
};

export type SimulationEventDetails =
  | BroadcastEventDetails
  | MessageTransferEventDetails
  | RouteSelectedEventDetails
  | DroppedEventDetails
  | ThroughputCalculationEventDetails
  | PeerMovedEventDetails
  | EntityStatusChangedEventDetails
  | RoutingTableChangeDetails
  | SimulationStepBoundaryDetails;

export type SimulationEvent = {
  id: UUID;
  tick: number;
  stepId: UUID | null;
  peerId: UUID;
  type: SimulationEventType;
  details: SimulationEventDetails;
};

export type SimulationPeerSnapshot = PeerEntity & {
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

export type SimulationTickSnapshot = {
  tick: number;
  entities: NetworkEntity[];
  peers: SimulationPeerSnapshot[];
};

export type SimulationStepResult = {
  step: WorkflowStep;
  events: SimulationEvent[];
  eventSnapshots: SimulationTickSnapshot[];
  snapshot: SimulationTickSnapshot;
};

export type SimulationInput = {
  entities: NetworkEntity[];
  steps: WorkflowStep[];
};

export type SimulationResult = {
  events: SimulationEvent[];
  steps: WorkflowStep[];
  stepResults: SimulationStepResult[];
};

export type SimulationPlaybackState = {
  result: SimulationResult | null;
  currentStepIndex: number;
  currentEventIndex: number;
  isRunning: boolean;
};
