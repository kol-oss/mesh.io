import { RoutingProtocol } from "@/shared/types/common/protocols";
import { EventType, type BroadcastEventDetails, type Event } from "@/shared/types/processor/events";
import { MessageType } from "@/shared/types/processor/messages";

const UNKNOWN_EVENT_TITLE = "Unknown Event";

const getBatmanEventTitle = (event: Event): string => {
  const { type, details } = event;

  if (type === EventType.Calculation) {
    return "Throughput Calculation";
  }

  if (type === EventType.Broadcast) {
    const { message, retransmit: isRetransmission } = details as BroadcastEventDetails;
    const { kind: messageType } = message;

    if (messageType === MessageType.BatmanEchoLocationMessage) {
      return "ELP Broadcast";
    }

    if (messageType === MessageType.BatmanOriginatorMessage) {
      return "OGMv2 Broadcast" + (isRetransmission ? " Retransmission" : "");
    }
  }

  if (type === EventType.GetRoute) {
    return "Originator Selected";
  }

  if (type === EventType.AddRoute) {
    return "Originator Added";
  }

  if (type === EventType.UpdateRoute) {
    return "Originator Updated";
  }

  if (type === EventType.DeleteRoute) {
    return "Originator Removed";
  }

  if (type === EventType.Drop) {
    return "OGMv2 Dropped";
  }

  return UNKNOWN_EVENT_TITLE;
};

export const getEventTitle = (event: Event): string => {
  const { protocol, type } = event;

  if (type === EventType.Transfer) {
    return "Message Transferred";
  }

  if (type === EventType.Move) {
    return "Entity Moved";
  }

  if (type === EventType.StatusChange) {
    return "Status Changed";
  }

  if (type === EventType.Drop && protocol === undefined) {
    return "Message Transfer Failed";
  }

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventTitle(event);
  }

  return UNKNOWN_EVENT_TITLE;
};
