import type { EventRecorder } from "@/features/processor/EventRecorder";
import type {
  DsrRouteChangeEventDetails,
  DsrRouteRecord,
} from "@/features/processor/types/protocols/dsr";
import { clone } from "@/features/processor/utils/clone";
import { EventType } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";

const PROTOCOL = RoutingProtocol.DSR;

export class RouteCache {
  private readonly peerId: UUID;
  private readonly eventRecorder: EventRecorder;
  private readonly routes = new Map<UUID, DsrRouteRecord[]>();
  private readonly routeTimeout: number;

  private onRouteDeleted?: (destinationId: UUID) => void;

  constructor(peerId: UUID, eventRecorder: EventRecorder, routeTimeout: number) {
    this.peerId = peerId;
    this.eventRecorder = eventRecorder;
    this.routeTimeout = routeTimeout;
  }

  setTimeoutListener(listener: (destinationId: UUID) => void) {
    this.onRouteDeleted = listener;
  }

  get(destinationId: UUID): DsrRouteRecord | null {
    const routes = this.routes.get(destinationId);
    if (!routes || routes.length === 0) {
      return null;
    }

    return this.selectShortestRoute(routes);
  }

  getByPrefix(destinationId: UUID): DsrRouteRecord | null {
    let shortestPrefixRoute: DsrRouteRecord | null = null;

    for (const routes of this.routes.values()) {
      for (const route of routes) {
        const { path } = route;
        const destinationIndex = path.indexOf(destinationId);
        if (destinationIndex === -1) continue;

        const prefixRoute = {
          ...route,
          path: path.slice(0, destinationIndex),
        } satisfies DsrRouteRecord;

        if (!shortestPrefixRoute || prefixRoute.path.length < shortestPrefixRoute.path.length) {
          shortestPrefixRoute = prefixRoute;
        }
      }
    }

    return shortestPrefixRoute;
  }

  getAll(): DsrRouteRecord[] {
    return Array.from(this.routes.values())
      .map((route) => clone(route))
      .flat();
  }

  insert(destinationId: UUID, path: UUID[]): DsrRouteRecord {
    const tick = this.eventRecorder.getCurrentTick();
    const route: DsrRouteRecord = {
      destinationId: destinationId,
      lastUpdateTick: tick,
      path: [...path],
    };

    const pathes = this.routes.get(destinationId) || [];
    pathes.push(route);

    this.routes.set(destinationId, pathes);
    return route;
  }

  // cleans expired routes based on route timeout
  tick(): void {
    const tick = this.eventRecorder.getCurrentTick();
    for (const [destinationId, routes] of this.routes.entries()) {
      const updatedRoutes = [...routes];
      let hasDeletedRoute = false;

      for (let index = updatedRoutes.length - 1; index >= 0; index -= 1) {
        const route = updatedRoutes[index];
        const ticksPassed = tick - route.lastUpdateTick;

        if (ticksPassed < this.routeTimeout) {
          continue;
        }

        hasDeletedRoute = true;
        updatedRoutes.splice(index, 1);

        if (updatedRoutes.length > 0) {
          this.routes.set(destinationId, updatedRoutes);
        } else {
          this.routes.delete(destinationId);
        }

        this.eventRecorder.record(
          this.peerId,
          EventType.DeleteRoute,
          {
            protocol: PROTOCOL,
            destinationId: destinationId,
            path: [this.peerId, ...route.path, route.destinationId],
            lastUpdateTick: route.lastUpdateTick,
            isSourceCaching: false,
          } satisfies DsrRouteChangeEventDetails,
          PROTOCOL,
        );
      }

      if (!hasDeletedRoute) {
        continue;
      }

      if (updatedRoutes.length === 0) {
        this.onRouteDeleted?.(destinationId);
      }
    }
  }

  removeByLink(sourceId: UUID, destinationId: UUID) {
    for (const [cachedDestinationId, routes] of this.routes.entries()) {
      const updatedRoutes = [...routes];

      for (let index = updatedRoutes.length - 1; index >= 0; index -= 1) {
        const route = updatedRoutes[index];
        const fullPath = [this.peerId, ...route.path, route.destinationId];

        let matchesLink = false;
        for (let pathIndex = 0; pathIndex < fullPath.length - 1; pathIndex += 1) {
          const currentId = fullPath[pathIndex];
          const nextId = fullPath[pathIndex + 1];

          if (
            (currentId === sourceId && nextId === destinationId) ||
            (currentId === destinationId && nextId === sourceId)
          ) {
            matchesLink = true;
            break;
          }
        }

        if (!matchesLink) {
          continue;
        }

        updatedRoutes.splice(index, 1);

        if (updatedRoutes.length > 0) {
          this.routes.set(cachedDestinationId, updatedRoutes);
        } else {
          this.routes.delete(cachedDestinationId);
        }

        this.eventRecorder.record(
          this.peerId,
          EventType.DeleteRoute,
          {
            protocol: PROTOCOL,
            destinationId: cachedDestinationId,
            path: fullPath,
            lastUpdateTick: route.lastUpdateTick,
            isSourceCaching: false,
          } satisfies DsrRouteChangeEventDetails,
          PROTOCOL,
        );
      }

      if (updatedRoutes.length === 0) {
        this.onRouteDeleted?.(cachedDestinationId);
      }
    }
  }

  private selectShortestRoute(routes: DsrRouteRecord[]): DsrRouteRecord {
    return routes.reduce((shortestRoute, currentRoute) => {
      if (currentRoute.path.length < shortestRoute.path.length) {
        return currentRoute;
      }

      return shortestRoute;
    });
  }
}
