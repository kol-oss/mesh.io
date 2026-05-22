import type {
  AodvRouteChangeEventDetails,
  AodvRouteRecord,
} from "../../../features/processor/types/aodv";
import type {
  BatmanCalculationEventDetails,
  BatmanRouteChangeEventDetails,
  BatmanRouteRecord,
} from "../../../features/processor/types/batman";
import type {
  DsdvRouteChangeEventDetails,
  DsdvRouteRecord,
} from "../../../features/processor/types/dsdv";
import type {
  DsrRouteChangeEventDetails,
  DsrRouteRecord,
} from "../../../features/processor/types/dsr";
import type {
  OlsrRouteChangeEventDetails,
  OlsrRouteRecord,
} from "../../../features/processor/types/olsr";
import type { EntityType } from "../model/entities";
import type { Message, Packet } from "./messages";
import type { RoutingProtocol } from "./protocols";
import type { UUID } from "./uuid";

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
  Transfer = "TRANSFER",
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
  protocol?: RoutingProtocol;
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

export enum DropReason {
  NoRoute = "NO_ROUTE",
  DestinationUnavailable = "DESTINATION_UNAVAILABLE",
  UnsupportedProtocol = "UNSUPPORTED_PROTOCOL",
  TimeToLiveExceeded = "TIME_TO_LIVE_EXCEEDED",
  Duplicate = "DUPLICATE",
  SourceIsTarget = "SOURCE_IS_TARGET",
  NotOptimalRoute = "NOT_OPTIMAL_ROUTE",
}

// for Drop event
export type DropEventDetails = {
  message?: Message;
  reason: DropReason;
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

// for Transfer event
export type TransferEventDetails = {
  protocol: RoutingProtocol;
  sourcePeerId: UUID;
  targetPeerId: UUID;
  message: Packet;
};

// for AddRoute, UpdateRoute, DeleteRoute events
export type RouteChangeEventDetails =
  | BatmanRouteChangeEventDetails
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
  | TransferEventDetails
  | DropEventDetails
  | CalculationEventDetails
  | MoveEventDetails
  | StatusChangeEventDetails
  | RouteChangeEventDetails;

export type EventListener = (event: Event) => void;
