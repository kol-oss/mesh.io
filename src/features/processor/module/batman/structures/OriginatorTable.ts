import { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type BatmanOriginatorMessage,
  type BatmanOriginatorRecord,
  type BatmanRouteChangeEventDetails,
  type BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman";
import { EventType } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import { clone } from "../../../utils/clone";
import { toRouteRecord } from "../../../utils/protocol/batman";
import { SequenceWindow } from "./SequenceWindow";

type BatmanProcessResult = {
  accepted: boolean;
  previousHopId: UUID | null;
  previousThroughput: number;
  nextHopId: UUID | null;
  nextThroughput: number;
};

const PROTOCOL = RoutingProtocol.BATMAN;

export class OriginatorTable {
  private readonly peerId: UUID;
  private readonly eventRecorder: EventRecorder;
  private readonly originators = new Map<UUID, Map<UUID, BatmanOriginatorRecord>>();
  private readonly purgeTimeout: number;

  private onRouteDeleted?: (hopId: UUID) => void;

  constructor(peerId: UUID, eventRecorder: EventRecorder, purgeTimeout: number) {
    this.peerId = peerId;
    this.eventRecorder = eventRecorder;
    this.purgeTimeout = purgeTimeout;
  }

  setPurgeListener(listener: (hopId: UUID) => void) {
    this.onRouteDeleted = listener;
  }

  // adds new route or creates new route record if it doesn't exist
  private insert(message: BatmanOriginatorMessage, throughput: number): boolean {
    const { sourceId: originatorId, senderId: senderId } = message;
    const route: BatmanOriginatorRecord = {
      hopId: senderId,
      throughput: throughput,
      sequenceWindow: new SequenceWindow(),
      lastTick: this.eventRecorder.getCurrentTick(),
    };

    const routes = this.originators.get(originatorId) ?? new Map<UUID, BatmanOriginatorRecord>();
    routes.set(senderId, route);

    this.originators.set(originatorId, routes);
    route.sequenceWindow.process(message.sequence);

    this.recordEvent(EventType.UpdateRoute, {
      originatorId,
      hopId: senderId,
      previousRoute: null,
      nextRoute: toRouteRecord(originatorId, route),
      message: clone(message),
    });

    return true;
  }

  // updates existing route
  private update(message: BatmanOriginatorMessage, throughput: number) {
    const { sourceId: originatorId, senderId: senderId } = message;

    const route = this.originators.get(originatorId)?.get(senderId);
    if (!route) {
      return false;
    }

    const previousRoute = toRouteRecord(originatorId, route);
    route.lastTick = this.eventRecorder.getCurrentTick();

    const processed = route.sequenceWindow.process(message.sequence);
    if (!processed) {
      return false;
    }

    route.throughput = throughput;
    this.recordEvent(EventType.UpdateRoute, {
      originatorId,
      hopId: senderId,
      previousRoute,
      nextRoute: toRouteRecord(originatorId, route),
      message: clone(message),
    });

    return processed;
  }

  // handles OGMv2 message and returns processing result information
  process(message: BatmanOriginatorMessage, throughput: number): BatmanProcessResult {
    const { sourceId: originatorId, senderId: senderId } = message;

    const routes = this.originators.get(originatorId);
    const previousBestRoute = this.getBestRoute(originatorId);

    const isNewRoute = !routes || !routes.has(senderId);
    const accepted = isNewRoute
      ? this.insert(message, throughput)
      : this.update(message, throughput);

    const nextBestRoute = this.getBestRoute(originatorId);
    return {
      accepted,
      previousHopId: previousBestRoute?.hopId ?? null,
      previousThroughput: previousBestRoute?.throughput ?? 0,
      nextHopId: nextBestRoute?.hopId ?? null,
      nextThroughput: nextBestRoute?.throughput ?? 0,
    };
  }

  // remove expired routes and records and updates sequence windows
  tick(): void {
    const tick = this.eventRecorder.getCurrentTick();

    for (const [originatorId, routes] of this.originators.entries()) {
      for (const [hopId, route] of routes.entries()) {
        if (route.lastTick === tick || tick - route.lastTick < this.purgeTimeout) {
          continue;
        }

        const previousRoute = toRouteRecord(originatorId, route);
        routes.delete(hopId);

        if (!this.hasRouteViaHop(hopId)) {
          this.onRouteDeleted?.(hopId);
        }

        this.recordEvent(EventType.DeleteRoute, {
          originatorId,
          hopId,
          previousRoute,
          nextRoute: null,
        });
      }

      if (routes.size === 0) {
        this.originators.delete(originatorId);
      }
    }
  }

  // returns best route by throughput for given originator
  getBestRoute(originatorId: UUID): BatmanRouteRecord | null {
    const routes = this.originators.get(originatorId);
    if (!routes || routes.size === 0) {
      return null;
    }

    let selected: BatmanOriginatorRecord | null = null;
    for (const route of routes.values()) {
      if (!selected || route.throughput > selected.throughput) {
        selected = route;
        continue;
      }

      if (route.throughput === selected.throughput && route.hopId === originatorId) {
        selected = route;
      }
    }

    return selected ? toRouteRecord(originatorId, selected) : null;
  }

  // returns all routes in the table
  getAllRoutes(): BatmanRouteRecord[] {
    const result: BatmanRouteRecord[] = [];
    for (const [originatorId, routes] of this.originators.entries()) {
      for (const route of routes.values()) {
        result.push(toRouteRecord(originatorId, route));
      }
    }

    return result;
  }

  // checks if there is at least one route via given hop
  private hasRouteViaHop(hopId: UUID): boolean {
    for (const routes of this.originators.values()) {
      if (routes.has(hopId)) {
        return true;
      }
    }

    return false;
  }

  private recordEvent(
    type: EventType,
    details: Omit<BatmanRouteChangeEventDetails, "protocol">,
  ): void {
    this.eventRecorder.record(
      this.peerId,
      type,
      {
        ...details,
        protocol: PROTOCOL,
      },
      PROTOCOL,
    );
  }
}
