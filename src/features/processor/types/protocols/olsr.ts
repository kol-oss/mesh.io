import type { BaseMessage, Message, MessageType } from "@/shared/types/common/messages.ts";
import type { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";

// HELLO message
export type OlsrHelloMessage = BaseMessage & {
  type: MessageType.OlsrHelloMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  interval: number;
  neighbours: UUID[];
  mprPeerIds: UUID[];
};

// Transaction Control message
export type OlsrTcMessage = BaseMessage & {
  type: MessageType.OlsrTcMessage;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  ansn: number;
  timeToLive: number;
  advertisedNeighbours: UUID[];
};

export enum OlsrNeighbourStatus {
  Symmetric,
  MultipointRelay,
}

// Neighbour Set record
export type OlsrNeighbourRecord = {
  neighbourPeerId: UUID;
  status: OlsrNeighbourStatus;
  lastUpdateTick: number;
};

// Two-Hop Neighbour Set record
export type OlsrTwoHopRecord = {
  destinationPeerId: UUID;
  viaPeerId: UUID;
  lastUpdateTick: number;
};

// MPR Selector Set record
export type OlsrSelectorRecord = {
  selectorPeerId: UUID;
  lastUpdateTick: number;
};

// Topology Table record
export type OlsrTopologyRecord = {
  destinationPeerId: UUID;
  lastHopPeerId: UUID;
  sequenceNumber: number;
  lastUpdateTick: number;
};

// Routing Table record
export type OlsrRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
};

// AddRoute, UpdateRoute, and DeleteRoute details
export type OlsrRouteChangeEventDetails = {
  protocol: typeof RoutingProtocol.OLSR;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: OlsrRouteRecord | null;
  nextRoute: OlsrRouteRecord | null;
  message?: Message;
};
