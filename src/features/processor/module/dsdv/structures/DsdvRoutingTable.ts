import type { EventRecorder } from "@/features/processor/EventRecorder";
import type {
  DsdvCalculationEventDetails,
  DsdvDropRouteEventDetails,
  DsdvRouteChangeEventDetails,
  DsdvRouteRecord,
  DsdvRouteUpdateMessage,
} from "@/features/processor/types/protocols/dsdv";
import { clone } from "@/features/processor/utils/clone";
import { DSDV_METRIC_INFINITY } from "@/shared/constants/protocols/dsdv";
import { DropReason, EventType } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";

const ROUTING_PROTOCOL = RoutingProtocol.DSDV;

export class DsdvRoutingTable {
  private readonly peerId: UUID;
  private readonly eventRecorder: EventRecorder;

  // routing substructures
  private readonly routes = new Map<UUID, DsdvRouteRecord>();
  private readonly pendingRoutes = new Set<DsdvRouteRecord>();

  // timeouts and intervals
  private readonly routeTimeout: number;

  constructor(peerId: UUID, eventRecorder: EventRecorder, routeTimeout: number) {
    this.peerId = peerId;
    this.eventRecorder = eventRecorder;
    this.routeTimeout = routeTimeout;
  }

  process(message: DsdvRouteUpdateMessage): void {
    const { senderPeerId: hopId, entries } = message;

    for (const entry of entries) {
      const { destinationPeerId: destinationId, sequenceNumber: sequence, metric } = entry;
      const route = this.routes.get(destinationId);

      // if the entry contains infinity metric and odd sequence, then the route is removed
      if (metric >= DSDV_METRIC_INFINITY && sequence % 2 === 1) {
        const route = this.remove(destinationId);
        this.pendingRoutes.add(route);

        return;
      }

      const hopCount = metric + 1;
      // if the entry is new row, then just insert
      if (!route) {
        const newRoute = this.insert(destinationId, hopId, hopCount, sequence);
        this.pendingRoutes.add(newRoute);
      }
      // if the route is already present, then sequence and metric comparison
      else {
        const routeSequence = route.sequenceNumber;
        const isNewSequence = sequence > routeSequence;
        const isBetterRoute = sequence === routeSequence && hopCount < route.metric;

        if (isNewSequence || isBetterRoute) {
          this.pendingRoutes.add(route);
          this.update(destinationId, hopId, hopCount, sequence);

          this.pendingRoutes.add(route);
        } else {
          this.eventRecorder.record(
            this.peerId,
            EventType.Drop,
            {
              message: clone(message),
              reason: DropReason.NotOptimalRoute,
              record: clone(entry),
            } as DsdvDropRouteEventDetails,
            ROUTING_PROTOCOL,
          );
        }
      }
    }
  }

  contains(destinationId: UUID): boolean {
    return this.routes.has(destinationId);
  }

  insert(
    destination: UUID,
    nextHop: UUID,
    metric: number = 0,
    sequence: number = 0,
  ): DsdvRouteRecord {
    const tick = this.eventRecorder.getCurrentTick();
    const route = {
      destinationPeerId: destination,
      nextHopPeerId: nextHop,
      metric,
      sequenceNumber: sequence,
      lastUpdateTick: tick,
    } satisfies DsdvRouteRecord;

    this.routes.set(destination, route);
    this.eventRecorder.record(
      this.peerId,
      EventType.AddRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: this.peerId,
        nextHopPeerId: this.peerId,
        previousRoute: null,
        nextRoute: clone(route),
      },
      ROUTING_PROTOCOL,
    );

    return route;
  }

  update(destination: UUID, nextHop: UUID, metric: number, sequence: number): void {
    const tick = this.eventRecorder.getCurrentTick();
    const previous = this.routes.get(destination);

    if (!previous) {
      throw new Error("Cannot update non-existing route. Use insert method instead.");
    }

    const route = {
      destinationPeerId: destination,
      nextHopPeerId: nextHop,
      metric,
      sequenceNumber: sequence,
      lastUpdateTick: tick,
    } satisfies DsdvRouteRecord;
    this.routes.set(destination, route);

    this.eventRecorder.record(
      this.peerId,
      EventType.UpdateRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: this.peerId,
        nextHopPeerId: this.peerId,
        previousRoute: clone(previous),
        nextRoute: clone(route),
      },
      ROUTING_PROTOCOL,
    );
  }

  remove(destination: UUID): DsdvRouteRecord {
    const route = this.routes.get(destination);
    if (!route) {
      throw new Error("Cannot remove non-existing route.");
    }
    this.routes.delete(destination);

    this.eventRecorder.record(
      this.peerId,
      EventType.DeleteRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: this.peerId,
        nextHopPeerId: this.peerId,
        previousRoute: clone(route),
        nextRoute: null,
      } satisfies DsdvRouteChangeEventDetails,
      ROUTING_PROTOCOL,
    );

    return route;
  }

  tick(): void {
    const tick = this.eventRecorder.getCurrentTick();

    for (const route of this.routes.values()) {
      const { destinationPeerId: destinationId, lastUpdateTick, sequenceNumber: sequence } = route;

      if (lastUpdateTick + this.routeTimeout <= tick) {
        route.metric = DSDV_METRIC_INFINITY;
        route.sequenceNumber += 1;

        this.eventRecorder.record(
          this.peerId,
          EventType.Calculation,
          {
            sequence: sequence,
            route: route,
          } satisfies DsdvCalculationEventDetails,
          RoutingProtocol.DSDV,
        );

        this.pendingRoutes.add(route);
        this.remove(destinationId);
      }
    }
  }

  getBestRoute(destinationPeerId: UUID): DsdvRouteRecord | null {
    const route = this.routes.get(destinationPeerId);
    if (!route || route.metric >= DSDV_METRIC_INFINITY) {
      return null;
    }

    return route;
  }

  getPendingRoutes(): DsdvRouteRecord[] {
    return Array.from(this.pendingRoutes);
  }

  getRoutes(): DsdvRouteRecord[] {
    return Array.from(this.routes.values()).map((route) => clone(route));
  }

  clearPendingRoutes(): void {
    this.pendingRoutes.clear();
  }
}
