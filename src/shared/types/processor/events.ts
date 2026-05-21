import type { RoutingProtocol } from "../common/protocols";
import type { UUID } from "../common/uuid";
import type { EntityType } from "../model/entities";
import type { AodvRouteChangeEventDetails, AodvRouteRecord } from "./aodv";
import type {
  BatmanCalculationEventDetails,
  BatmanRouteRecord,
  BatmanRouteUpdateEventDetails,
} from "./batman";
import type { DsdvRouteChangeEventDetails, DsdvRouteRecord } from "./dsdv";
import type { DsrRouteChangeEventDetails, DsrRouteRecord } from "./dsr";
import type { Message, Packet } from "./messages";
import type { OlsrRouteChangeEventDetails, OlsrRouteRecord } from "./olsr";

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

// for Calculation event
export type CalculationEventDetails = BatmanCalculationEventDetails;

// for Drop event
export type DropEventDetails = {
  message?: Message;
  reason: string;
  reasonCode?: "NO_ROUTE" | "SOURCE_UNAVAILABLE";
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
  | BatmanRouteUpdateEventDetails
  | DsdvRouteChangeEventDetails
  | AodvRouteChangeEventDetails
  | OlsrRouteChangeEventDetails
  | DsrRouteChangeEventDetails;

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
  entityType: EntityType;
  previousEnabled: boolean;
  nextEnabled: boolean;
};

export type EventDetails =
  | BroadcastEventDetails
  | GetRouteEventDetails
  | DropEventDetails
  | CalculationEventDetails
  | MoveEventDetails
  | StatusChangeEventDetails
  | RouteChangeEventDetails;
