import type { Event, RouteChangeEventDetails } from "@/shared/types/common/events";
import { EventType } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";

/**
 * Collapses consecutive BATMAN originator RoutingTableInsert+Update event pairs into just the
 * Update event, removing the redundant Insert that immediately precedes it for the same originator.
 */
export function collapseOriginatorInsertUpdateEvents(events: Event[]): Event[] {
  const skipIds = new Set<string>();

  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index];
    const next = events[index + 1];

    if (current.type !== EventType.AddRoute || next.type !== EventType.UpdateRoute) {
      continue;
    }

    if (current.peerId !== next.peerId) {
      continue;
    }

    const currentDetails = current.details as RouteChangeEventDetails;
    const nextDetails = next.details as RouteChangeEventDetails;

    if (
      currentDetails.protocol !== RoutingProtocol.BATMAN ||
      nextDetails.protocol !== RoutingProtocol.BATMAN
    ) {
      continue;
    }

    if (
      currentDetails.originatorPeerId !== nextDetails.originatorPeerId ||
      currentDetails.hopPeerId !== nextDetails.hopPeerId
    ) {
      continue;
    }

    skipIds.add(current.id);
  }

  return events.filter((event) => !skipIds.has(event.id));
}
