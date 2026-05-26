import type { AodvRouteRecord } from "@/features/processor/types/protocols/aodv";
import type { UUID } from "@/shared/types/common/uuid";

export type AodvRouteEntry = AodvRouteRecord & {
  expiresAtTick: number;
};

export class RoutingTable {
  private readonly routes = new Map<UUID, AodvRouteEntry>();

  get(destinationPeerId: UUID) {
    return this.routes.get(destinationPeerId) ?? null;
  }

  set(destinationPeerId: UUID, route: AodvRouteEntry) {
    this.routes.set(destinationPeerId, route);
  }

  delete(destinationPeerId: UUID) {
    this.routes.delete(destinationPeerId);
  }

  entries() {
    return this.routes.entries();
  }

  values() {
    return this.routes.values();
  }

  touch(destinationPeerId: UUID, currentTick: number, lifetime: number) {
    const route = this.routes.get(destinationPeerId);
    if (!route) {
      return;
    }

    this.routes.set(destinationPeerId, {
      ...route,
      lastUpdateTick: currentTick,
      expiresAtTick: currentTick + Math.max(1, lifetime),
    });
  }

  addPrecursor(destinationPeerId: UUID, precursorPeerId: UUID) {
    const route = this.routes.get(destinationPeerId);
    if (!route || route.precursors.includes(precursorPeerId)) {
      return;
    }

    this.routes.set(destinationPeerId, {
      ...route,
      precursors: [...route.precursors, precursorPeerId],
    });
  }

  getRoutes(selfPeerId: UUID): AodvRouteRecord[] {
    return [...this.routes.values()]
      .filter((route) => route.destinationPeerId !== selfPeerId)
      .sort((left, right) => left.destinationPeerId.localeCompare(right.destinationPeerId))
      .map((route) => ({
        destinationPeerId: route.destinationPeerId,
        nextHopPeerId: route.nextHopPeerId,
        metric: route.metric,
        sequenceNumber: route.sequenceNumber,
        lastUpdateTick: route.lastUpdateTick,
        validSequenceNumber: route.validSequenceNumber,
        valid: route.valid,
        precursors: [...route.precursors],
      }));
  }
}
