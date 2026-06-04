import {
  MessageType,
  type BaseMessage,
  type Message,
} from "../../../../shared/types/common/messages";
import type { RoutingProtocol } from "../../../../shared/types/common/protocols";
import type { UUID } from "../../../../shared/types/common/uuid";

// RREQ message
export type AodvRouteRequestMessage = BaseMessage & {
  type: MessageType.AodvRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationPeerId: UUID;
  requestId: number;
  hopCount: number;
  destinationSequenceNumber: number | null;
  originatorSequenceNumber: number;
};

// RREP message
export type AodvRouteReplyMessage = BaseMessage & {
  type: MessageType.AodvRouteReplyMessage;
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

// Destination Unreachable information
export type AodvUnreachableDestination = {
  destinationPeerId: UUID;
  sequenceNumber: number;
};

// RERR message
export type AodvRouteErrorMessage = BaseMessage & {
  type: MessageType.AodvRouteErrorMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID | null;
  unreachableDestinations: AodvUnreachableDestination[];
  noDelete: boolean;
};

// HELLO message
export type AodvHelloMessage = BaseMessage & {
  type: MessageType.AodvHelloMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationSequenceNumber: number;
  lifetime: number;
  interval: number;
};

export type AodvControlMessage =
  | AodvHelloMessage
  | AodvRouteRequestMessage
  | AodvRouteReplyMessage
  | AodvRouteErrorMessage;

export type AodvCalculationEventDetails = {
  message: AodvHelloMessage | AodvRouteReplyMessage | AodvRouteErrorMessage;
};

// Routing Table record
export type AodvRouteRecord = {
  destinationId: UUID;
  sequence: number;
  validSequence: boolean;
  hopCount: number;
  nextHopId: UUID;
  lastUpdateTick: number;
  valid: boolean;
  precursors: UUID[];
};

// AddRoute, UpdateRoute, and DeleteRoute details
export type AodvRouteChangeEventDetails = {
  protocol: typeof RoutingProtocol.AODV;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: AodvRouteRecord | null;
  nextRoute: AodvRouteRecord | null;
  message?: Message;
};
