import { DsdvUpdateType } from "@/features/processor/types/protocols/dsdv";
import {
  type BroadcastEventDetails,
  type DropEventDetails,
  DropReason,
  type Event,
  EventDetailsType,
  EventType,
  type GetRouteEventDetails,
  type RouteChangeEventDetails,
} from "@/shared/types/common/events";
import { MessageType } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";

export const getEventProtocol = (event: Event): RoutingProtocol | undefined => {
  if (
    event.type === EventType.AddRoute ||
    event.type === EventType.UpdateRoute ||
    event.type === EventType.DeleteRoute
  ) {
    return (event.details as RouteChangeEventDetails).protocol;
  }

  if (event.type === EventType.GetRoute) {
    return (event.details as GetRouteEventDetails).protocol;
  }

  if (event.type === EventType.Transfer) {
    return undefined;
  }

  if (event.protocol) {
    return event.protocol;
  }

  return undefined;
};

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

const getDsdvEventDetailsType = (event: Event): EventDetailsType => {
  const { type, details } = event;

  if (type === EventType.Broadcast) {
    const { message } = details as BroadcastEventDetails;
    const { type: messageType } = message;

    if (messageType !== MessageType.DsdvRouteUpdateMessage) {
      return EventDetailsType.Unknown;
    }

    if (message.updateType === DsdvUpdateType.FullDump) {
      return EventDetailsType.DsdvFullDumpMessageBroadcast;
    }

    if (message.updateType === DsdvUpdateType.Incremental) {
      return EventDetailsType.DsdvIncrementalMessageBroadcast;
    }
  }

  if (type === EventType.GetRoute) {
    return EventDetailsType.DsdvRouteSelected;
  }

  if (type === EventType.AddRoute) {
    return EventDetailsType.DsdvRouteAdded;
  }

  if (type === EventType.UpdateRoute) {
    return EventDetailsType.DsdvRouteUpdated;
  }

  if (type === EventType.DeleteRoute) {
    return EventDetailsType.DsdvRouteRemoved;
  }

  if (type === EventType.Calculation) {
    return EventDetailsType.DsdvRouteExpiredCalculation;
  }

  if (type === EventType.Drop) {
    const { reason } = details as DropEventDetails;
    if (reason === DropReason.Skip) return EventDetailsType.DsdvRefreshSkipped;

    return EventDetailsType.DsdvRouteDropped;
  }

  return EventDetailsType.Unknown;
};

const getAodvEventDetailsType = (event: Event): EventDetailsType => {
  const { type, details } = event;

  if (type === EventType.Broadcast) {
    const { message, retransmit: isRetransmission } = details as BroadcastEventDetails;

    if (message.type === MessageType.AodvHelloMessage) {
      return EventDetailsType.AodvHelloMessageBroadcast;
    }

    if (message.type === MessageType.AodvRouteRequestMessage) {
      return isRetransmission
        ? EventDetailsType.AodvRouteRequestRetransmission
        : EventDetailsType.AodvRouteRequestBroadcast;
    }

    if (message.type === MessageType.AodvRouteErrorMessage) {
      return EventDetailsType.AodvRouteErrorBroadcast;
    }
  }

  if (type === EventType.Calculation) {
    const { message } = details as { message?: { type?: MessageType } };

    if (message?.type === MessageType.AodvRouteReplyMessage) {
      return EventDetailsType.AodvRouteReplyForwarded;
    }

    if (message?.type === MessageType.AodvRouteErrorMessage) {
      return EventDetailsType.AodvRouteErrorProcessed;
    }
  }

  if (type === EventType.GetRoute) {
    return EventDetailsType.AodvRouteSelected;
  }

  if (type === EventType.AddRoute) {
    return EventDetailsType.AodvRouteAdded;
  }

  if (type === EventType.UpdateRoute) {
    return EventDetailsType.AodvRouteUpdated;
  }

  if (type === EventType.DeleteRoute) {
    return EventDetailsType.AodvRouteRemoved;
  }

  if (type === EventType.Drop) {
    return EventDetailsType.AodvRouteDropped;
  }

  return EventDetailsType.Unknown;
};

const getOlsrEventDetailsType = (event: Event): EventDetailsType => {
  const { type, details } = event;

  if (type === EventType.Broadcast) {
    const { message, retransmit: isRetransmission } = details as BroadcastEventDetails;

    if (message.type === MessageType.OlsrHelloMessage) {
      return EventDetailsType.OlsrHelloMessageBroadcast;
    }

    if (message.type === MessageType.OlsrTcMessage) {
      return isRetransmission
        ? EventDetailsType.OlsrTcMessageRetransmission
        : EventDetailsType.OlsrTcMessageBroadcast;
    }
  }

  if (type === EventType.GetRoute) {
    return EventDetailsType.OlsrRouteSelected;
  }

  if (type === EventType.Calculation) {
    return EventDetailsType.OlsrRouteCalculation;
  }

  if (type === EventType.AddRoute) {
    return EventDetailsType.OlsrRouteAdded;
  }

  if (type === EventType.UpdateRoute) {
    return EventDetailsType.OlsrRouteUpdated;
  }

  if (type === EventType.DeleteRoute) {
    return EventDetailsType.OlsrRouteRemoved;
  }

  if (type === EventType.Drop) {
    return EventDetailsType.OlsrRouteDropped;
  }

  return EventDetailsType.Unknown;
};

const getDsrEventDetailsType = (event: Event): EventDetailsType => {
  const { type, details } = event;

  if (type === EventType.Broadcast) {
    const { message, retransmit: isRetransmission } = details as BroadcastEventDetails;
    const { type: messageType } = message;

    if (messageType === MessageType.DsrRouteRequestMessage) {
      return isRetransmission
        ? EventDetailsType.DsrRouteRequestRetransmission
        : EventDetailsType.DsrRouteRequestBroadcast;
    }

    if (messageType === MessageType.DsrRouteReplyMessage) {
      return EventDetailsType.DsrRouteReplyForwarded;
    }

    if (messageType === MessageType.DsrRouteErrorMessage) {
      return EventDetailsType.DsrRouteSalvage;
    }
  }

  if (type === EventType.Calculation) {
    return EventDetailsType.DsrPathRecalculated;
  }

  if (type === EventType.GetRoute) {
    return EventDetailsType.DsrRouteSelected;
  }

  if (type === EventType.AddRoute) {
    return EventDetailsType.DsrRouteAdded;
  }

  if (type === EventType.UpdateRoute) {
    return EventDetailsType.DsrRouteUpdated;
  }

  if (type === EventType.DeleteRoute) {
    return EventDetailsType.DsrRouteRemoved;
  }

  if (type === EventType.Drop) {
    return EventDetailsType.DsrRouteDropped;
  }

  return EventDetailsType.Unknown;
};

export const getEventDetailsType = (event: Event): EventDetailsType => {
  const { type } = event;
  const protocol = getEventProtocol(event);

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

  if (protocol === RoutingProtocol.DSDV) {
    return getDsdvEventDetailsType(event);
  }

  if (protocol === RoutingProtocol.AODV) {
    return getAodvEventDetailsType(event);
  }

  if (protocol === RoutingProtocol.OLSR) {
    return getOlsrEventDetailsType(event);
  }

  if (protocol === RoutingProtocol.DSR) {
    return getDsrEventDetailsType(event);
  }

  return EventDetailsType.Unknown;
};
