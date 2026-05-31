import type {
  BaseMessage,
  BasePacket,
  Message,
  MessageType,
} from "@/shared/types/common/messages.ts";
import type { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";

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

// RREQ message
export type NewDsrRouteRequestMessage = BaseMessage & {
  type: MessageType.DsrRouteRequestMessage;
  identification: number;
  sourceId: UUID;
  destinationId: UUID;
  addresses: UUID[];
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

// RREP message
export type NewDsrRouteReplyMessage = BaseMessage & {
  type: MessageType.DsrRouteReplyMessage;
  identification: number;
  sourceId: UUID;
  destinationId: UUID;
  addresses: UUID[];
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

// Route Request Table Record
export type DsrRouteRequestTableRecord = {
  destinationId: UUID;
  sourceId: UUID;
  identification: number;
};

// Packet with path included
export type DsrPacket = BasePacket & {
  type: MessageType.DsrPacket;
  path: UUID[];
};

// Calculation details
export type DsrCalculationEventDetails = {
  isFromCache: boolean;
  sourceId: UUID;
  destinationId: UUID;
  receivedPath: UUID[];
  reversedPath: UUID[];
};

// AddRoute, UpdateRoute, and DeleteRoute details
export type DsrRouteChangeEventDetails = {
  protocol: typeof RoutingProtocol.DSR;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: DsrRouteRecord | null;
  nextRoute: DsrRouteRecord | null;
  message?: Message;
};
