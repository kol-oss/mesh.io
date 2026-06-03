import { EventDetailsType, EventType, type Event } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";

const LINK_PREFIX = "/docs";
const UNKNOWN_EVENT_LINK = `${LINK_PREFIX}/system#events`;

const getBatmanEventLink = (event: Event, detailsType: EventDetailsType) => {
  const { type: eventType } = event;
  const prefix = `${LINK_PREFIX}/batman`;

  if (detailsType === EventDetailsType.BatmanThroughputCalculation) {
    return `${prefix}#throughput-calculation`;
  }
  if (detailsType === EventDetailsType.BatmanEchoLocationMessageBroadcast) {
    return `${prefix}#echo-location-protocol`;
  }
  if (
    detailsType === EventDetailsType.BatmanOriginatorMessageBroadcast ||
    detailsType === EventDetailsType.BatmanOriginatorMessageRetransmission
  ) {
    return `${prefix}#originator-message`;
  }
  if (detailsType === EventDetailsType.BatmanOriginatorUpdated) {
    return `${prefix}#sequence-protection-window`;
  }

  if (
    eventType === EventType.GetRoute ||
    eventType === EventType.Transfer ||
    eventType === EventType.AddRoute ||
    eventType === EventType.UpdateRoute ||
    eventType === EventType.DeleteRoute
  ) {
    return `${prefix}#route-selection`;
  }

  return `${prefix}#what-you-need-to-know`;
};

const getDsdvEventLink = (event: Event, detailsType: EventDetailsType) => {
  const { type: eventType } = event;
  const prefix = `${LINK_PREFIX}/dsdv`;

  if (
    detailsType === EventDetailsType.DsdvIncrementalMessageBroadcast ||
    detailsType === EventDetailsType.DsdvFullDumpMessageBroadcast
  ) {
    return `${prefix}#updates-sharing`;
  }

  if (
    eventType === EventType.AddRoute ||
    eventType === EventType.UpdateRoute ||
    eventType === EventType.DeleteRoute
  ) {
    return `${prefix}#routing-maintenance`;
  }

  if (eventType === EventType.GetRoute || eventType === EventType.Transfer) {
    return `${prefix}#route-selection`;
  }

  return `${prefix}#what-you-need-to-know`;
};

const getDsrEventLink = (event: Event, detailsType: EventDetailsType) => {
  const { type: eventType } = event;
  const prefix = `${LINK_PREFIX}/dsr`;

  if (
    detailsType === EventDetailsType.DsrRouteRequestBroadcast ||
    detailsType === EventDetailsType.DsrRouteRequestRetransmission ||
    detailsType === EventDetailsType.DsrRouteReplyForwarded ||
    detailsType === EventDetailsType.DsrPathRecalculated
  ) {
    return `${prefix}#route-discovery`;
  }

  if (detailsType === EventDetailsType.DsrRouteSalvage) {
    return `${prefix}#route-maintenance`;
  }

  if (
    eventType === EventType.AddRoute ||
    eventType === EventType.UpdateRoute ||
    eventType === EventType.DeleteRoute
  ) {
    return `${prefix}#route-cache`;
  }

  if (eventType === EventType.GetRoute || eventType === EventType.Transfer) {
    return `${prefix}#route-selection`;
  }

  return `${prefix}#what-you-need-to-know`;
};

export const getEventLink = (event: Event, detailsType: EventDetailsType): string => {
  const { protocol } = event;
  if (protocol === RoutingProtocol.DSDV) {
    return getDsdvEventLink(event, detailsType);
  }

  if (protocol === RoutingProtocol.BATMAN) {
    return getBatmanEventLink(event, detailsType);
  }

  if (protocol === RoutingProtocol.DSR) {
    return getDsrEventLink(event, detailsType);
  }

  return UNKNOWN_EVENT_LINK;
};
