import type { BaseMessage, Message, MessageType } from "../../../shared/types/common/messages";
import type { RoutingProtocol } from "../../../shared/types/common/protocols";
import type { UUID } from "../../../shared/types/common/uuid";

// Echo Location Protocol message
export type BatmanEchoLocationMessage = BaseMessage & {
  type: MessageType.BatmanEchoLocationMessage;
  version: number;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  timeToLive: number;
  numNeighbours: number;
  sequence: number;
  interval: number;
  neighbours: UUID[];
};

// Originator Message version 2 message
export type BatmanOriginatorMessage = BaseMessage & {
  type: MessageType.BatmanOriginatorMessage;
  version: number;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  sequence: number;
  timeToLive: number;
  throughput: number;
};

// Neighbours List record
export type BatmanNeighbourRecord = {
  neighbourPeerId: UUID;
  quality: number;
  lastTick: number;
  interval: number;
};

// Originator Table record
export type BatmanRouteRecord = {
  originatorPeerId: UUID;
  hopPeerId: UUID;
  quality: number;
  qualityWindow: boolean[];
  lastTick: number;
};

// Calculation details
export type BatmanCalculationEventDetails = {
  message: Message;
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

// AddRoute, UpdateRoute, and DeleteRoute details
export type BatmanRouteUpdateEventDetails = {
  protocol: RoutingProtocol.BATMAN;
  originatorPeerId: UUID;
  hopPeerId: UUID;
  previousRoute: BatmanRouteRecord | null;
  nextRoute: BatmanRouteRecord | null;
  message?: Message;
  reason: string;
};
