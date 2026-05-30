import type { EventRecorder } from "@/features/processor/EventRecorder";
import type { DsrRouteRecord } from "@/features/processor/types/protocols/dsr";
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

  constructor(peerId: UUID, eventRecorder: EventRecorder, routeTimeout: number) {
    this.peerId = peerId;
    this.eventRecorder = eventRecorder;
    this.routeTimeout = routeTimeout;
  }

  get(destinationId: UUID): DsrRouteRecord | null {
    const routes = this.routes.get(destinationId);
    if (!routes || routes.length === 0) {
      return null;
    }
    return routes[0];
  }

  getAll() {
    return Array.from(this.routes.values()).map((route) => clone(route));
  }

  insert(destinationId: UUID, path: UUID[], sequence: number): DsrRouteRecord {
    const tick = this.eventRecorder.getCurrentTick();
    const route: DsrRouteRecord = {
      destinationPeerId: destinationId,
      nextHopPeerId: path[1],
      metric: path.length - 1,
      sequenceNumber: sequence,
      lastUpdateTick: tick,
      pathPeerIds: [...path],
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
      for (const route of routes) {
        const ticksPassed = tick - route.lastUpdateTick;
        if (ticksPassed < this.routeTimeout) {
          continue;
        }

        this.routes.delete(destinationId);
        this.eventRecorder.record(
          this.peerId,
          EventType.DeleteRoute,
          {
            protocol: PROTOCOL,
            destinationPeerId: destinationId,
            nextHopPeerId: route.nextHopPeerId,
            previousRoute: clone(route),
            nextRoute: null,
          },
          PROTOCOL,
        );
      }
    }
  }
}
