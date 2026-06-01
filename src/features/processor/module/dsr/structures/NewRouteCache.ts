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
    return routes[0];
  }

  getByPrefix(destinationId: UUID): DsrRouteRecord | null {
    for (const routes of this.routes.values()) {
      for (const route of routes) {
        const { path } = route;
        if (path.includes(destinationId)) {
          return {
            ...route,
            path: path.slice(0, path.indexOf(destinationId) - 1),
          };
        }
      }
    }

    return null;
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
      const updatedRoutes = routes.filter((route) => {
        const ticksPassed = tick - route.lastUpdateTick;

        if (ticksPassed < this.routeTimeout) {
          return true;
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

        return false;
      });

      if (updatedRoutes.length !== routes.length) {
        this.routes.set(destinationId, updatedRoutes);
      }

      if (updatedRoutes.length === 0) {
        this.routes.delete(destinationId);
        this.onRouteDeleted?.(destinationId);
      }
    }
  }
}
