import {
  EventDetailsType,
  EventType,
  type BroadcastEventDetails,
  type Event,
} from "@/shared/types/common/events";
import { MessageType } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";

const getBatmanEventDetailsType = (event: Event): EventDetailsType => {
  const { type, details } = event;

  if (type === EventType.Calculation) {
    return EventDetailsType.BatmanThroughputCalculation;
  }

  if (type === EventType.Broadcast) {
    const { message, retransmit: isRetransmission } = details as BroadcastEventDetails;
    const { type: messageType } = message;

    if (messageType === MessageType.BatmanEchoLocationMessage) {
      return EventDetailsType.BatmanEchoLocationMessageBroadcast;
    }

    if (messageType === MessageType.BatmanOriginatorMessage) {
      return isRetransmission
        ? EventDetailsType.BatmanOriginatorMessageRetransmission
        : EventDetailsType.BatmanOriginatorMessageBroadcast;
    }
  }

  if (type === EventType.GetRoute) {
    return EventDetailsType.BatmanOriginatorSelected;
  }

  if (type === EventType.AddRoute) {
    return EventDetailsType.BatmanOriginatorAdded;
  }

  if (type === EventType.UpdateRoute) {
    return EventDetailsType.BatmanOriginatorUpdated;
  }

  if (type === EventType.DeleteRoute) {
    return EventDetailsType.BatmanOriginatorRemoved;
  }

  if (type === EventType.Drop) {
    return EventDetailsType.BatmanOriginatorMessageDropped;
  }

  return EventDetailsType.Unknown;
};

export const getEventDetailsType = (event: Event): EventDetailsType => {
  const { protocol, type } = event;

  if (type === EventType.Transfer) {
    return EventDetailsType.Transfer;
  }

  if (type === EventType.Move) {
    return EventDetailsType.Move;
  }

  if (type === EventType.StatusChange) {
    return EventDetailsType.StatusChange;
  }

  if (type === EventType.Drop && protocol === undefined) {
    return EventDetailsType.Drop;
  }

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventDetailsType(event);
  }

  return EventDetailsType.Unknown;
};
