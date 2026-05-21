import type { RoutingProtocol } from "../common/protocols";
import type { UUID } from "../common/uuid";
import type { NetworkEntity } from "../model/entities";
import type {
  AodvRouteRecord,
  AodvRoutingTableChangeDetails,
  BatmanRouteRecord,
  BatmanRoutingTableChangeDetails,
  DsdvRouteRecord,
  DsdvRoutingTableChangeDetails,
  DsrRouteRecord,
  DsrRoutingTableChangeDetails,
  EventDetails,
  Message,
  OlsrRouteRecord,
  OlsrRoutingTableChangeDetails,
  Packet,
} from "./simulation";

export enum EventType {
  // internal events
  Broadcast = "BROADCAST",
  Calculation = "CALCULATION",
  Drop = "DROP",
  // routing events
  GetRoute = "GET_ROUTE",
  AddRoute = "ADD_ROUTE",
  UpdateRoute = "UPDATE_ROUTE",
  DeleteRoute = "DELETE_ROUTE",
  // step events
  Move = "MOVE",
  StatusChange = "STATUS_CHANGE",
}
export type Event = {
  id: UUID;
  tick: number;
  stepId: UUID | null;
  peerId: UUID;
  type: EventType;
  details: EventDetails;
};

// for Broadcast event
export type BroadcastEventDetails = {
  neighbourPeerIds: UUID[];
  retransmit: boolean;
  message: Message;
  note?: string;
};

// for Drop event
export type DropEventDetails = {
  message?: Message;
  reason: string;
  reasonCode?: "NO_ROUTE" | "SOURCE_UNAVAILABLE";
};

export type MessageEventDetails = {
  hopPeerId: UUID;
  message: Message;
};

// for Move event
export type MoveEventDetails = {
  peerId: UUID;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

// for StatusChange event
export type StatusChangeEventDetails = {
  entityId: UUID;
  entityType: NetworkEntity["type"];
  previousEnabled: boolean;
  nextEnabled: boolean;
};

// for GetRoute event
export type GetRouteEventDetails = {
  protocol: RoutingProtocol;
  destinationPeerId: UUID;
  selectedRoute:
    | BatmanRouteRecord
    | DsdvRouteRecord
    | AodvRouteRecord
    | OlsrRouteRecord
    | DsrRouteRecord;
  message: Packet;
};

// for AddRoute, UpdateRoute, DeleteRoute events
export type RouteChangeEventDetails =
  | BatmanRoutingTableChangeDetails
  | DsdvRoutingTableChangeDetails
  | AodvRoutingTableChangeDetails
  | OlsrRoutingTableChangeDetails
  | DsrRoutingTableChangeDetails;
