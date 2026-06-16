import type {
  AodvCalculationEventDetails,
  AodvRouteChangeEventDetails,
  AodvRouteRecord,
} from "@/features/processor/types/protocols/aodv.ts";
import type {
  BatmanCalculationEventDetails,
  BatmanRouteChangeEventDetails,
  BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman.ts";
import type {
  DsdvCalculationEventDetails,
  DsdvRouteChangeEventDetails,
  DsdvRouteRecord,
} from "@/features/processor/types/protocols/dsdv.ts";
import type {
  DsrCalculationEventDetails,
  DsrPacket,
  DsrPathRecord,
  DsrRouteChangeEventDetails,
} from "@/features/processor/types/protocols/dsr.ts";
import type {
  OlsrCalculationEventDetails,
  OlsrNeighbourChangeEventDetails,
  OlsrRouteChangeEventDetails,
  OlsrRouteRecord,
} from "@/features/processor/types/protocols/olsr.ts";
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
};

// for Calculation event
export type CalculationEventDetails =
  | BatmanCalculationEventDetails
  | DsdvCalculationEventDetails
  | DsrCalculationEventDetails
  | OlsrCalculationEventDetails
  | AodvCalculationEventDetails;

export enum DropReason {
  NoRoute = "NO_ROUTE",
  DestinationUnavailable = "DESTINATION_UNAVAILABLE",
  UnsupportedProtocol = "UNSUPPORTED_PROTOCOL",
  TimeToLiveExceeded = "TIME_TO_LIVE_EXCEEDED",
  Duplicate = "DUPLICATE",
  SourceIsTarget = "SOURCE_IS_TARGET",
  NotOptimalRoute = "NOT_OPTIMAL_ROUTE",
  Skip = "SKIP",
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
    | DsrPathRecord;
  message: Packet;
};

// for Transfer event
export type TransferEventDetails = {
  protocol: RoutingProtocol;
  sourcePeerId: UUID;
  targetPeerId: UUID;
  message: Packet | DsrPacket;
};

// for AddRoute, UpdateRoute, DeleteRoute events
export type RouteChangeEventDetails =
  | BatmanRouteChangeEventDetails
  | DsdvRouteChangeEventDetails
  | AodvRouteChangeEventDetails
  | OlsrRouteChangeEventDetails
  | OlsrNeighbourChangeEventDetails
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

export enum EventDetailsType {
  // General event details types
  Transfer,
  Move,
  StatusChange,
  Drop,
  Unknown,
  // DSDV-specific event details types
  DsdvIncrementalMessageBroadcast,
  DsdvFullDumpMessageBroadcast,
  DsdvRouteSelected,
  DsdvRouteAdded,
  DsdvRouteUpdated,
  DsdvRouteRemoved,
  DsdvRouteDropped,
  DsdvRefreshSkipped,
  DsdvRouteExpiredCalculation,
  // Batman-specific event details types
  BatmanThroughputCalculation,
  BatmanEchoLocationMessageBroadcast,
  BatmanOriginatorMessageBroadcast,
  BatmanOriginatorMessageRetransmission,
  BatmanOriginatorSelected,
  BatmanOriginatorAdded,
  BatmanOriginatorUpdated,
  BatmanOriginatorRemoved,
  BatmanOriginatorMessageDropped,
  // AODV-specific event details types
  AodvHelloMessageBroadcast,
  AodvRouteRequestBroadcast,
  AodvRouteRequestRetransmission,
  AodvRouteReplyForwarded,
  AodvRouteErrorProcessed,
  AodvRouteErrorBroadcast,
  AodvRouteSelected,
  AodvRouteAdded,
  AodvRouteUpdated,
  AodvRouteRemoved,
  AodvRouteDropped,
  // OLSR-specific event details types
  OlsrHelloMessageBroadcast,
  OlsrTcMessageBroadcast,
  OlsrTcMessageRetransmission,
  OlsrRouteCalculation,
  OlsrRouteSelected,
  OlsrRouteAdded,
  OlsrRouteUpdated,
  OlsrRouteRemoved,
  OlsrRouteDropped,
  // DSR-specific event details types
  DsrRouteRequestBroadcast,
  DsrRouteRequestRetransmission,
  DsrRouteReplyForwarded,
  DsrPathRecalculated,
  DsrRouteSalvage,
  DsrRouteSelected,
  DsrRouteAdded,
  DsrRouteUpdated,
  DsrRouteRemoved,
  DsrRouteDropped,
}
