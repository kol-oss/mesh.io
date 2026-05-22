import { EventRecorder } from "@/features/processor/EventRecorder";
import type { Node } from "@/features/processor/types/peer";
import {
  type DsdvRouteRecord,
  type DsdvRouteUpdateMessage,
} from "@/features/processor/types/protocols/dsdv";
import { DSDV_METRIC_INFINITY } from "@/shared/constants/dsdv";
import { EventType } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import { cloneDsdvMessage } from "./dsdvMessage";

type DsdvRouteState = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
  deleteAfterTick: number | null;
  changed: boolean;
};

export class DsdvRoutingTable {
  private readonly routes = new Map<UUID, DsdvRouteState>();

  private readonly pendingWithdrawals = new Map<UUID, DsdvRouteState>();

  private readonly routingPeer: Node;

  private readonly eventRecorder: EventRecorder;

  private getRouteTimeout: () => number;

  private getRouteExpiryTick: (nextHopPeerId: UUID, fallbackTick: number) => number;

  constructor(params: {
    routingPeer: Node;
    eventRecorder: EventRecorder;
    getRouteTimeout: () => number;
    getRouteExpiryTick: (nextHopPeerId: UUID, fallbackTick: number) => number;
  }) {
    this.routingPeer = params.routingPeer;
    this.eventRecorder = params.eventRecorder;
    this.getRouteTimeout = params.getRouteTimeout;
    this.getRouteExpiryTick = params.getRouteExpiryTick;
  }

  upsertSelfRoute(sequenceNumber: number) {
    const tick = this.eventRecorder.getCurrentTick();
    const previous = this.routes.get(this.routingPeer.id) ?? null;
    const nextState: DsdvRouteState = {
      destinationPeerId: this.routingPeer.id,
      nextHopPeerId: this.routingPeer.id,
      metric: 0,
      sequenceNumber,
      lastUpdateTick: tick,
      deleteAfterTick: null,
      changed: true,
    };

    this.routes.set(this.routingPeer.id, nextState);

    if (!previous) {
      this.eventRecorder.record(this.routingPeer.id, EventType.AddRoute, {
        protocol: RoutingProtocol.DSDV,
        destinationPeerId: this.routingPeer.id,
        nextHopPeerId: this.routingPeer.id,
        previousRoute: null,
        nextRoute: this.toRecord(nextState),
        reason: "Initial self route created",
      });
      return;
    }

    this.eventRecorder.record(this.routingPeer.id, EventType.UpdateRoute, {
      protocol: RoutingProtocol.DSDV,
      destinationPeerId: this.routingPeer.id,
      nextHopPeerId: this.routingPeer.id,
      previousRoute: this.toRecord(previous),
      nextRoute: this.toRecord(nextState),
      reason: "Self sequence number advanced for periodic advertisement",
    });
  }

  processIncomingEntry(params: {
    senderPeerId: UUID;
    destinationPeerId: UUID;
    incomingMetric: number;
    incomingSequenceNumber: number;
    message: DsdvRouteUpdateMessage;
  }) {
    if (params.destinationPeerId === this.routingPeer.id) {
      return false;
    }

    const metric = Math.min(DSDV_METRIC_INFINITY, Math.max(0, params.incomingMetric));
    const current = this.routes.get(params.destinationPeerId) ?? null;
    const hasSequenceIncrease =
      current !== null && params.incomingSequenceNumber > current.sequenceNumber;
    const hasLowerMetricAtSameSequence =
      current !== null &&
      params.incomingSequenceNumber === current.sequenceNumber &&
      metric < current.metric;
    const hasNextHopChangeAtSameCost =
      current !== null &&
      params.incomingSequenceNumber === current.sequenceNumber &&
      metric === current.metric &&
      current.nextHopPeerId !== params.senderPeerId;

    const shouldAccept =
      current === null ||
      hasSequenceIncrease ||
      hasLowerMetricAtSameSequence ||
      hasNextHopChangeAtSameCost;

    if (!shouldAccept) {
      return false;
    }

    const tick = this.eventRecorder.getCurrentTick();
    const routeTimeout = Math.max(1, this.getRouteTimeout());
    const nextState: DsdvRouteState = {
      destinationPeerId: params.destinationPeerId,
      nextHopPeerId: params.senderPeerId,
      metric,
      sequenceNumber: params.incomingSequenceNumber,
      lastUpdateTick: tick,
      deleteAfterTick: metric >= DSDV_METRIC_INFINITY ? tick + routeTimeout : null,
      changed: true,
    };

    this.pendingWithdrawals.delete(params.destinationPeerId);
    this.routes.set(params.destinationPeerId, nextState);

    const reason = current
      ? `Accepted fresher or better DSDV route (seq ${params.incomingSequenceNumber}, metric ${metric}).`
      : `Discovered new DSDV route (seq ${params.incomingSequenceNumber}, metric ${metric}).`;

    this.eventRecorder.record(
      this.routingPeer.id,
      current ? EventType.UpdateRoute : EventType.AddRoute,
      {
        protocol: RoutingProtocol.DSDV,
        destinationPeerId: params.destinationPeerId,
        nextHopPeerId: params.senderPeerId,
        previousRoute: current ? this.toRecord(current) : null,
        nextRoute: this.toRecord(nextState),
        message: cloneDsdvMessage(params.message),
        reason,
      },
    );

    return true;
  }

  tick() {
    const tick = this.eventRecorder.getCurrentTick();
    let changed = false;

    for (const [destinationPeerId, route] of this.routes.entries()) {
      if (destinationPeerId === this.routingPeer.id) {
        continue;
      }

      if (
        route.metric < DSDV_METRIC_INFINITY &&
        tick >= this.getRouteExpiryTick(route.nextHopPeerId, route.lastUpdateTick)
      ) {
        const previousRoute = this.toRecord(route);
        const withdrawalSequenceNumber =
          route.sequenceNumber % 2 === 0 ? route.sequenceNumber + 1 : route.sequenceNumber;

        this.routes.delete(destinationPeerId);
        this.pendingWithdrawals.set(destinationPeerId, {
          destinationPeerId: previousRoute.destinationPeerId,
          nextHopPeerId: previousRoute.nextHopPeerId,
          metric: DSDV_METRIC_INFINITY,
          sequenceNumber: withdrawalSequenceNumber,
          lastUpdateTick: tick,
          deleteAfterTick: null,
          changed: true,
        });
        changed = true;

        this.eventRecorder.record(this.routingPeer.id, EventType.DeleteRoute, {
          protocol: RoutingProtocol.DSDV,
          destinationPeerId: previousRoute.destinationPeerId,
          nextHopPeerId: previousRoute.nextHopPeerId,
          previousRoute,
          nextRoute: null,
          reason: `Route deleted because no DSDV full dump was received from next hop ${previousRoute.nextHopPeerId} by tick ${tick}.`,
        });

        continue;
      }

      if (
        route.metric >= DSDV_METRIC_INFINITY &&
        route.deleteAfterTick !== null &&
        tick >= route.deleteAfterTick
      ) {
        const previousRoute = this.toRecord(route);
        this.routes.delete(destinationPeerId);
        changed = true;

        this.eventRecorder.record(this.routingPeer.id, EventType.DeleteRoute, {
          protocol: RoutingProtocol.DSDV,
          destinationPeerId: previousRoute.destinationPeerId,
          nextHopPeerId: previousRoute.nextHopPeerId,
          previousRoute,
          nextRoute: null,
          reason: `Invalid DSDV route garbage-collected after ${Math.max(1, this.getRouteTimeout())} ticks.`,
        });
      }
    }

    return changed;
  }

  getBestRoute(destinationPeerId: UUID): DsdvRouteRecord | null {
    const route = this.routes.get(destinationPeerId);
    if (!route || route.metric >= DSDV_METRIC_INFINITY) {
      return null;
    }

    return this.toRecord(route);
  }

  getChangedRoutes() {
    return [...this.routes.values(), ...this.pendingWithdrawals.values()]
      .filter((route) => route.changed)
      .map((route) => this.toRecord(route));
  }

  clearChangedFlags() {
    for (const route of this.routes.values()) {
      route.changed = false;
    }

    this.pendingWithdrawals.clear();
  }

  getRoutes() {
    return [...this.routes.values()]
      .map((route) => this.toRecord(route))
      .sort((left, right) => left.destinationPeerId.localeCompare(right.destinationPeerId));
  }

  private toRecord(route: DsdvRouteState): DsdvRouteRecord {
    return {
      destinationPeerId: route.destinationPeerId,
      nextHopPeerId: route.nextHopPeerId,
      metric: route.metric,
      sequenceNumber: route.sequenceNumber,
      lastUpdateTick: route.lastUpdateTick,
    };
  }
}
