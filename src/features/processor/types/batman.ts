import type { BaseMessage, Message, MessageType } from "../../../shared/types/common/messages";
import type { RoutingProtocol } from "../../../shared/types/common/protocols";
import type { UUID } from "../../../shared/types/common/uuid";
import type { SequenceWindow } from "../service/batman/SequenceWindow";

// Echo Location Protocol message
export type BatmanEchoLocationMessage = BaseMessage & {
  type: MessageType.BatmanEchoLocationMessage;
  version: number;
  sourceId: UUID;
  senderId: UUID;
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
  sourceId: UUID;
  senderId: UUID;
  sequence: number;
  timeToLive: number;
  throughput: number;
};

// Neighbours List record
export type BatmanNeighbourRecord = {
  neighbourId: UUID;
  throughput: number;
  lastTick: number;
  interval: number;
};

// Originator Table record
export type BatmanOriginatorRecord = {
  hopId: UUID;
  throughput: number;
  sequenceWindow: SequenceWindow;
  lastTick: number;
};

// Originator Table serializable record
export type BatmanRouteRecord = {
  originatorId: UUID;
  hopId: UUID;
  throughput: number;
  sequenceWindow: boolean[];
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
export type BatmanRouteChangeEventDetails = {
  protocol: RoutingProtocol.BATMAN;
  originatorId: UUID;
  hopId: UUID;
  previousRoute: BatmanRouteRecord | null;
  nextRoute: BatmanRouteRecord | null;
  message?: Message;
  reason: string;
};
