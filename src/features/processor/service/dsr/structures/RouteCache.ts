import type { DsrRouteRecord } from "@/features/processor/types/protocols/dsr";
import type { UUID } from "@/shared/types/common/uuid";

type RouteKey = UUID;

type ExcludedLink = [UUID, UUID];

export type RouteCacheUpsertResult = {
  previousRoute: DsrRouteRecord | null;
  nextRoute: DsrRouteRecord;
  changed: boolean;
};

export class RouteCache {
  private readonly routes = new Map<RouteKey, DsrRouteRecord>();

  get(destinationPeerId: UUID) {
    return this.routes.get(destinationPeerId) ?? null;
  }

  entries() {
    return this.routes.entries();
  }

  getAll() {
    return [...this.routes.values()].sort((left, right) =>
      left.destinationPeerId.localeCompare(right.destinationPeerId),
    );
  }

  upsert(
    ownerPeerId: UUID,
    destinationPeerId: UUID,
    pathPeerIds: UUID[],
    sequenceNumber: number,
    tick: number,
  ): RouteCacheUpsertResult | null {
    if (pathPeerIds.length < 2 || pathPeerIds[0] !== ownerPeerId) {
      return null;
    }

    const previousRoute = this.get(destinationPeerId);
    const nextRoute: DsrRouteRecord = {
      destinationPeerId,
      nextHopPeerId: pathPeerIds[1],
      metric: pathPeerIds.length - 1,
      sequenceNumber,
      lastUpdateTick: tick,
      pathPeerIds: [...pathPeerIds],
    };

    const changed =
      !previousRoute ||
      previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
      previousRoute.metric !== nextRoute.metric ||
      previousRoute.pathPeerIds.join("|") !== nextRoute.pathPeerIds.join("|");

    this.routes.set(
      destinationPeerId,
      changed ? nextRoute : { ...nextRoute, sequenceNumber: previousRoute.sequenceNumber },
    );

    return {
      previousRoute,
      nextRoute,
      changed,
    };
  }

  findUsable(
    ownerPeerId: UUID,
    destinationPeerId: UUID,
    options?: { excludedLink?: ExcludedLink },
  ) {
    const route = this.get(destinationPeerId);
    if (!route) {
      return null;
    }

    if (route.pathPeerIds.length < 2 || route.pathPeerIds[0] !== ownerPeerId) {
      return null;
    }

    if (!options?.excludedLink) {
      return route;
    }

    const [blockedFromPeerId, blockedToPeerId] = options.excludedLink;
    for (let index = 0; index < route.pathPeerIds.length - 1; index += 1) {
      if (
        route.pathPeerIds[index] === blockedFromPeerId &&
        route.pathPeerIds[index + 1] === blockedToPeerId
      ) {
        return null;
      }
    }

    return route;
  }

  removeExpired(ownerPeerId: UUID, currentTick: number, timeout: number) {
    const removed: Array<{ destinationPeerId: UUID; route: DsrRouteRecord }> = [];

    for (const [destinationPeerId, route] of this.routes.entries()) {
      if (destinationPeerId === ownerPeerId) {
        continue;
      }

      if (currentTick - route.lastUpdateTick < timeout) {
        continue;
      }

      this.routes.delete(destinationPeerId);
      removed.push({ destinationPeerId, route });
    }

    return removed;
  }

  removeUsingBrokenLink(brokenFromPeerId: UUID, brokenToPeerId: UUID) {
    const removed: Array<{ destinationPeerId: UUID; route: DsrRouteRecord }> = [];

    for (const [destinationPeerId, route] of this.routes.entries()) {
      const usesBrokenLink = route.pathPeerIds.some(
        (peerId, index) =>
          index < route.pathPeerIds.length - 1 &&
          peerId === brokenFromPeerId &&
          route.pathPeerIds[index + 1] === brokenToPeerId,
      );

      if (!usesBrokenLink) {
        continue;
      }

      this.routes.delete(destinationPeerId);
      removed.push({ destinationPeerId, route });
    }

    return removed;
  }
}
