import type { NetworkEntity, PeerEntity } from "./entities";
import type { WorkflowStep } from "./steps";

export const SimulationEventType = {
  SystemMessageBroadcast: "SYSTEM_MESSAGE_BROADCAST",
  SystemMessageSent: "SYSTEM_MESSAGE_SENT",
  SystemThroughputCalculated: "SYSTEM_THROUGHPUT_CALCULATED",
  SystemMessageDropped: "SYSTEM_MESSAGE_DROPPED",
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
  sourcePeerId: string | null;
  destinationPeerId: string;
  timeToLive: number;
};

export type BatmanOriginatorMessage = {
  kind: typeof SimulationMessageKind.BatmanOriginatorMessage;
  version: number;
  sourcePeerId: string;
  senderPeerId: string;
  sequence: number;
  timeToLive: number;
  throughput: number;
};

export type BatmanEchoLocationNeighbour = {
  address: string;
};

export type BatmanEchoLocationMessage = {
  kind: typeof SimulationMessageKind.BatmanEchoLocationMessage;
  packetType: "ELP";
  version: number;
  sourcePeerId: string;
  senderPeerId: string;
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
  originatorPeerId: string;
  hopPeerId: string;
  quality: number;
  qualityWindow: string;
  lastTick: number;
};

export type BatmanNeighbourRecord = {
  neighbourPeerId: string;
  quality: number;
  lastTick: number;
  interval: number;
};

export type RoutingTableChangeDetails = {
  originatorPeerId: string;
  hopPeerId: string;
  previousRoute: BatmanRouteRecord | null;
  nextRoute: BatmanRouteRecord | null;
  message?: SimulationMessage;
  reason: string;
};

export type BroadcastEventDetails = {
  neighbourPeerIds: string[];
  retransmit: boolean;
  message: SimulationMessage;
};

export type MessageTransferEventDetails = {
  hopPeerId: string;
  message: SimulationMessage;
};

export type DroppedEventDetails = {
  message: SimulationMessage;
  reason: string;
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

export type SimulationStepBoundaryDetails = {
  stepId: string;
  stepTitle: string;
  stepType: WorkflowStep["type"];
};

export type SimulationEventDetails =
  | BroadcastEventDetails
  | MessageTransferEventDetails
  | DroppedEventDetails
  | ThroughputCalculationEventDetails
  | RoutingTableChangeDetails
  | SimulationStepBoundaryDetails;

export type SimulationEvent = {
  id: string;
  tick: number;
  stepId: string | null;
  peerId: string;
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
