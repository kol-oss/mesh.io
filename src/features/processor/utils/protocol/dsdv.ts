import type { DsdvRouteRecord, DsdvRouteUpdateRecordEntry } from "../../types/protocols/dsdv";

export const toMessageRecord = (route: DsdvRouteRecord): DsdvRouteUpdateRecordEntry => {
  return {
    destinationPeerId: route.destinationPeerId,
    nextHopPeerId: route.nextHopPeerId,
    sequenceNumber: route.sequenceNumber,
    metric: route.metric,
  } satisfies DsdvRouteUpdateRecordEntry;
};
