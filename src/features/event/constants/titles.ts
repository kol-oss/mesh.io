import { EventDetailsType } from "@/shared/types/common/events";

const UNKNOWN_EVENT_TITLE = "Unknown Event";

const EVENT_TITLES = new Map<EventDetailsType, string>([
  // General event details types
  [EventDetailsType.Transfer, "Message Transferred"],
  [EventDetailsType.Move, "Entity Moved"],
  [EventDetailsType.StatusChange, "Status Changed"],
  [EventDetailsType.Drop, "Message Dropped"],
  [EventDetailsType.Unknown, UNKNOWN_EVENT_TITLE],
  // Batman-specific event details types
  [EventDetailsType.BatmanThroughputCalculation, "Throughput Calculation"],
  [EventDetailsType.BatmanEchoLocationMessageBroadcast, "ELP Broadcast"],
  [EventDetailsType.BatmanOriginatorMessageBroadcast, "OGMv2 Broadcast"],
  [EventDetailsType.BatmanOriginatorMessageRetransmission, "OGMv2 Broadcast Retransmission"],
  [EventDetailsType.BatmanOriginatorSelected, "Originator Selected"],
  [EventDetailsType.BatmanOriginatorAdded, "Originator Added"],
  [EventDetailsType.BatmanOriginatorUpdated, "Originator Updated"],
  [EventDetailsType.BatmanOriginatorRemoved, "Originator Removed"],
]);

export const getEventTitle = (eventType: EventDetailsType): string => {
  return EVENT_TITLES.get(eventType) ?? UNKNOWN_EVENT_TITLE;
};
