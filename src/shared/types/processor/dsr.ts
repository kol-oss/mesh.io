import type { RoutingProtocol } from "../common/protocols";
import type { UUID } from "../common/uuid";
import type { Message, MessageType } from "./messages";

// RREQ message
export type DsrRouteRequestMessage = {
  kind: MessageType.DsrRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

// RREP message
export type DsrRouteReplyMessage = {
  kind: MessageType.DsrRouteReplyMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

// RERR message
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

// Route Record
export type DsrRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
  pathPeerIds: UUID[];
};

// AddRoute, UpdateRoute, and DeleteRoute details
export type DsrRouteChangeEventDetails = {
  protocol: typeof RoutingProtocol.DSR;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: DsrRouteRecord | null;
  nextRoute: DsrRouteRecord | null;
  message?: Message;
  reason: string;
};
