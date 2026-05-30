import { EventDetailsType } from "@/shared/types/common/events";

const UNKNOWN_EVENT_TITLE = "Unknown Event";

const EVENT_TITLES = new Map<EventDetailsType, string>([
  // General event details types
  [EventDetailsType.Transfer, "Message Transferred"],
  [EventDetailsType.Move, "Entity Moved"],
  [EventDetailsType.StatusChange, "Status Changed"],
  [EventDetailsType.Drop, "Message Dropped"],
  [EventDetailsType.Unknown, UNKNOWN_EVENT_TITLE],
  // DSDV-specific event details types
  [EventDetailsType.DsdvIncrementalMessageBroadcast, "DSDV Incremental Broadcast"],
  [EventDetailsType.DsdvFullDumpMessageBroadcast, "DSDV Full Dump Broadcast"],
  [EventDetailsType.DsdvRouteSelected, "DSDV Route Selected"],
  [EventDetailsType.DsdvRouteAdded, "DSDV Route Added"],
  [EventDetailsType.DsdvRouteUpdated, "DSDV Route Updated"],
  [EventDetailsType.DsdvRouteRemoved, "DSDV Route Removed"],
  [EventDetailsType.DsdvRouteDropped, "DSDV Route Dropped"],
  [EventDetailsType.DsdvRefreshSkipped, "DSDV Refresh Skipped"],
  [EventDetailsType.DsdvRouteExpiredCalculation, "DSDV Route Expired"],
  // Batman-specific event details types
  [EventDetailsType.BatmanThroughputCalculation, "Throughput Calculation"],
  [EventDetailsType.BatmanEchoLocationMessageBroadcast, "ELP Broadcast"],
  [EventDetailsType.BatmanOriginatorMessageBroadcast, "OGMv2 Broadcast"],
  [EventDetailsType.BatmanOriginatorMessageRetransmission, "OGMv2 Broadcast Retransmission"],
  [EventDetailsType.BatmanOriginatorSelected, "Originator Selected"],
  [EventDetailsType.BatmanOriginatorAdded, "Originator Added"],
  [EventDetailsType.BatmanOriginatorUpdated, "Originator Updated"],
  [EventDetailsType.BatmanOriginatorRemoved, "Originator Removed"],
  [EventDetailsType.BatmanOriginatorMessageDropped, "OGMv2 Message Dropped"],
  // AODV-specific event details types
  [EventDetailsType.AodvHelloMessageBroadcast, "AODV HELLO Broadcast"],
  [EventDetailsType.AodvRouteRequestBroadcast, "AODV Route Request Broadcast"],
  [EventDetailsType.AodvRouteRequestRetransmission, "AODV Route Request Retransmission"],
  [EventDetailsType.AodvRouteReplyForwarded, "AODV Route Reply Forwarded"],
  [EventDetailsType.AodvRouteErrorProcessed, "AODV Route Error Processed"],
  [EventDetailsType.AodvRouteSelected, "AODV Route Selected"],
  [EventDetailsType.AodvRouteAdded, "AODV Route Added"],
  [EventDetailsType.AodvRouteUpdated, "AODV Route Updated"],
  [EventDetailsType.AodvRouteRemoved, "AODV Route Removed"],
  [EventDetailsType.AodvRouteDropped, "AODV Route Dropped"],
  // OLSR-specific event details types
  [EventDetailsType.OlsrHelloMessageBroadcast, "OLSR HELLO Broadcast"],
  [EventDetailsType.OlsrTcMessageBroadcast, "OLSR TC Broadcast"],
  [EventDetailsType.OlsrTcMessageRetransmission, "OLSR TC Retransmission"],
  [EventDetailsType.OlsrRouteCalculation, "OLSR Route Calculation"],
  [EventDetailsType.OlsrRouteSelected, "OLSR Route Selected"],
  [EventDetailsType.OlsrRouteAdded, "OLSR Route Added"],
  [EventDetailsType.OlsrRouteUpdated, "OLSR Route Updated"],
  [EventDetailsType.OlsrRouteRemoved, "OLSR Route Removed"],
  [EventDetailsType.OlsrRouteDropped, "OLSR Route Dropped"],
  // DSR-specific event details types
  [EventDetailsType.DsrRouteRequestBroadcast, "DSR Route Request Broadcast"],
  [EventDetailsType.DsrRouteRequestRetransmission, "DSR Route Request Retransmission"],
  [EventDetailsType.DsrRouteReplyForwarded, "DSR Route Reply Forwarded"],
  [EventDetailsType.DsrRouteSalvage, "DSR Packet Salvage"],
  [EventDetailsType.DsrControlProcessed, "DSR Control Processed"],
  [EventDetailsType.DsrRouteSelected, "DSR Route Selected"],
  [EventDetailsType.DsrRouteAdded, "DSR Route Cached"],
  [EventDetailsType.DsrRouteUpdated, "DSR Route Updated"],
  [EventDetailsType.DsrRouteRemoved, "DSR Route Removed"],
  [EventDetailsType.DsrRouteDropped, "DSR Route Dropped"],
]);

export const getEventTitle = (eventType: EventDetailsType): string => {
  return EVENT_TITLES.get(eventType) ?? UNKNOWN_EVENT_TITLE;
};
