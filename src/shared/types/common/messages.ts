import type {
  AodvHelloMessage,
  AodvRouteErrorMessage,
  AodvRouteReplyMessage,
  AodvRouteRequestMessage,
} from "../../../features/processor/types/protocols/aodv";
import type {
  BatmanEchoLocationMessage,
  BatmanOriginatorMessage,
} from "../../../features/processor/types/protocols/batman";
import type { DsdvRouteUpdateMessage } from "../../../features/processor/types/protocols/dsdv";
import type {
  DsrRouteErrorMessage,
  DsrRouteReplyMessage,
  DsrRouteRequestMessage,
  NewDsrRouteReplyMessage,
  NewDsrRouteRequestMessage,
} from "../../../features/processor/types/protocols/dsr";
import type {
  OlsrHelloMessage,
  OlsrTcMessage,
} from "../../../features/processor/types/protocols/olsr";
import type { UUID } from "./uuid";

export enum MessageType {
  Packet = "PACKET",
  BatmanOriginatorMessage = "BATMAN_ORIGINATOR_MESSAGE",
  BatmanEchoLocationMessage = "BATMAN_ECHO_LOCATION_MESSAGE",
  DsdvRouteUpdateMessage = "DSDV_ROUTE_UPDATE_MESSAGE",
  AodvRouteRequestMessage = "AODV_ROUTE_REQUEST_MESSAGE",
  AodvRouteReplyMessage = "AODV_ROUTE_REPLY_MESSAGE",
  AodvRouteErrorMessage = "AODV_ROUTE_ERROR_MESSAGE",
  AodvHelloMessage = "AODV_HELLO_MESSAGE",
  OlsrHelloMessage = "OLSR_HELLO_MESSAGE",
  OlsrTcMessage = "OLSR_TC_MESSAGE",
  DsrRouteRequestMessage = "DSR_ROUTE_REQUEST_MESSAGE",
  DsrRouteReplyMessage = "DSR_ROUTE_REPLY_MESSAGE",
  DsrRouteErrorMessage = "DSR_ROUTE_ERROR_MESSAGE",
}

export type BaseMessage = {
  type: MessageType;
};

export type Packet = BaseMessage & {
  type: MessageType.Packet;
  sourcePeerId: UUID | null;
  destinationPeerId: UUID;
  timeToLive: number;
};

export type Message =
  | Packet
  | BatmanOriginatorMessage
  | BatmanEchoLocationMessage
  | DsdvRouteUpdateMessage
  | AodvRouteRequestMessage
  | AodvRouteReplyMessage
  | AodvRouteErrorMessage
  | AodvHelloMessage
  | OlsrHelloMessage
  | OlsrTcMessage
  | DsrRouteRequestMessage
  | DsrRouteReplyMessage
  | DsrRouteErrorMessage
  | NewDsrRouteRequestMessage
  | NewDsrRouteReplyMessage;
