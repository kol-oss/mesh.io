import type { NetworkEntity, PeerEntity } from "./entities";
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

export type SimulationMessage =
  | SimulationPacket
  | BatmanOriginatorMessage
  | BatmanEchoLocationMessage;

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

export type RoutingTableChangeDetails = {
  originatorPeerId: UUID;
  hopPeerId: UUID;
  previousRoute: BatmanRouteRecord | null;
  nextRoute: BatmanRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type BroadcastEventDetails = {
  neighbourPeerIds: UUID[];
  retransmit: boolean;
  message: SimulationMessage;
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
  destinationPeerId: UUID;
  selectedRoute: BatmanRouteRecord;
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
  routingTable: BatmanRouteRecord[];
  neighboursTable: BatmanNeighbourRecord[];
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
