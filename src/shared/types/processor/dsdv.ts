import type { RoutingProtocol } from "../common/protocols";
import type { UUID } from "../common/uuid";
import type { Message, MessageType } from "./messages";

export enum DsdvUpdateType {
  FullDump = "FULL_DUMP",
  Incremental = "INCREMENTAL",
}

// Routing Table record
export type DsdvRouteRecord = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
};

// Route Record message
export type DsdvRouteRecordMessage = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  sequenceNumber: number;
  metric: number;
};

// Route Update message
export type DsdvRouteUpdateMessage = {
  kind: MessageType.DsdvRouteUpdateMessage;
  updateType: DsdvUpdateType;
  sourcePeerId: UUID;
  senderPeerId: UUID;
  hopCount: number;
  entries: DsdvRouteRecordMessage[];
};

// AddRoute, UpdateRoute, and DeleteRoute details
export type DsdvRouteChangeEventDetails = {
  protocol: typeof RoutingProtocol.DSDV;
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  previousRoute: DsdvRouteRecord | null;
  nextRoute: DsdvRouteRecord | null;
  message?: Message;
  reason: string;
};
