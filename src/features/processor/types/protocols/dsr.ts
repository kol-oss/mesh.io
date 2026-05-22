import type { BaseMessage, Message, MessageType } from "../../../../shared/types/common/messages";
import type { RoutingProtocol } from "../../../../shared/types/common/protocols";
import type { UUID } from "../../../../shared/types/common/uuid";

// RREQ message
export type DsrRouteRequestMessage = BaseMessage & {
  type: MessageType.DsrRouteRequestMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

// RREP message
export type DsrRouteReplyMessage = BaseMessage & {
  type: MessageType.DsrRouteReplyMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  targetPeerId: UUID;
  requestId: number;
  hopLimit: number;
  routePeerIds: UUID[];
};

// RERR message
export type DsrRouteErrorMessage = BaseMessage & {
  type: MessageType.DsrRouteErrorMessage;
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
