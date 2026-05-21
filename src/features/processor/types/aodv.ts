import type { Message, MessageType } from "../../../shared/types/common/messages";
import type { RoutingProtocol } from "../../../shared/types/common/protocols";
import type { UUID } from "../../../shared/types/common/uuid";

// RREQ message
export type AodvRouteRequestMessage = {
  kind: MessageType.AodvRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationPeerId: UUID;
  requestId: number;
  hopCount: number;
  destinationSequenceNumber: number | null;
  originatorSequenceNumber: number;
};

// RREP message
export type AodvRouteReplyMessage = {
  kind: MessageType.AodvRouteReplyMessage;
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
export type AodvRouteErrorMessage = {
  kind: MessageType.AodvRouteErrorMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID | null;
  unreachableDestinations: AodvUnreachableDestination[];
  noDelete: boolean;
};

// HELLO message
export type AodvHelloMessage = {
  kind: MessageType.AodvHelloMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  destinationSequenceNumber: number;
  lifetime: number;
  interval: number;
};

// Routing Table record
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

// AddRoute, UpdateRoute, and DeleteRoute details
export type AodvRouteChangeEventDetails = {
  protocol: typeof RoutingProtocol.AODV;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: AodvRouteRecord | null;
  nextRoute: AodvRouteRecord | null;
  message?: Message;
  reason: string;
};
