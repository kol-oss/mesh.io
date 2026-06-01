import type { DsrRouteRecord } from "@/features/processor/types/protocols/dsr";
import { clone } from "@/features/processor/utils/clone";
import type { UUID } from "@/shared/types/common/uuid";

type ExcludedLink = [UUID, UUID];

export type RouteCacheUpsertResult = {
  previousRoute: DsrRouteRecord | null;
  nextRoute: DsrRouteRecord;
  changed: boolean;
};

export class RouteCache {
  private readonly routes = new Map<UUID, DsrRouteRecord>();

  get(destinationId: UUID): DsrRouteRecord | null {
    return this.routes.get(destinationId) ?? null;
  }

  getAll() {
    return Array.from(this.routes.values()).map((route) => clone(route));
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
      destinationId: destinationPeerId,
      nextHopPeerId: pathPeerIds[1],
      metric: pathPeerIds.length - 1,
      identification: sequenceNumber,
      lastUpdateTick: tick,
      path: [...pathPeerIds],
    };

    const changed =
      !previousRoute ||
      previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
      previousRoute.metric !== nextRoute.metric ||
      previousRoute.path.join("|") !== nextRoute.path.join("|");

    this.routes.set(
      destinationPeerId,
      changed ? nextRoute : { ...nextRoute, identification: previousRoute.identification },
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

    if (route.path.length < 2 || route.path[0] !== ownerPeerId) {
      return null;
    }

    if (!options?.excludedLink) {
      return route;
    }

    const [blockedFromPeerId, blockedToPeerId] = options.excludedLink;
    for (let index = 0; index < route.path.length - 1; index += 1) {
      if (route.path[index] === blockedFromPeerId && route.path[index + 1] === blockedToPeerId) {
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
      const usesBrokenLink = route.path.some(
        (peerId, index) =>
          index < route.path.length - 1 &&
          peerId === brokenFromPeerId &&
          route.path[index + 1] === brokenToPeerId,
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
