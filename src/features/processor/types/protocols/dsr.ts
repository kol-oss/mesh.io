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
  path: UUID[];
};

// RREP message
export type DsrRouteReplyMessage = BaseMessage & {
  type: MessageType.DsrRouteReplyMessage;
  sourceId: UUID;
  senderPeerId: UUID;
  destinationId: UUID;
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
  path: UUID[];
};

// RERR message
export type DsrRouteErrorMessage = BaseMessage & {
  type: MessageType.DsrRouteErrorMessage;
  sourceId: UUID;
  destinationId: UUID;
  errorSourceId: UUID;
  errorDestinationId: UUID;
  salvageCount: number;
};

// Route Record
export type DsrRouteRecord = {
  destinationId: UUID;
  lastUpdateTick: number;
  path: UUID[];
};

// Route Record
export type DsrPathRecord = {
  path: UUID[];
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
  salvageCount: number;
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
  destinationId: UUID;
  path: UUID[];
  identification?: number;
  lastUpdateTick: number;
  isSourceCaching: boolean;
  message?: Message;
};
