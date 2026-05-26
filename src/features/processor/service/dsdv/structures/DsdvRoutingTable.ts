import { EventRecorder } from "@/features/processor/EventRecorder";
import type { NodeWrapper } from "@/features/processor/types/node";
import {
  type DsdvRouteRecord,
  type DsdvRouteUpdateMessage,
} from "@/features/processor/types/protocols/dsdv";
import { clone } from "@/features/processor/utils/messages";
import { DSDV_METRIC_INFINITY } from "@/shared/constants/protocols/dsdv";
import { EventType } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";

type DsdvRouteState = {
  destinationPeerId: UUID;
  nextHopPeerId: UUID;
  metric: number;
  sequenceNumber: number;
  lastUpdateTick: number;
  deleteAfterTick: number | null;
  changed: boolean;
};

type DsdvFullDumpTiming = {
  lastTick: number;
  interval: number;
};

export class DsdvRoutingTable {
  private readonly routes = new Map<UUID, DsdvRouteState>();
  private readonly pendingWithdrawals = new Map<UUID, DsdvRouteState>();
  private readonly fullDumpTimingByNeighbour = new Map<UUID, DsdvFullDumpTiming>();
  private readonly peer: NodeWrapper;
  private readonly eventRecorder: EventRecorder;

  private readonly routeTimeout: number;
  private readonly fullDumpInterval: number;

  constructor(params: {
    routingPeer: NodeWrapper;
    eventRecorder: EventRecorder;
    routeTimeout: number;
    fullDumpInterval: number;
  }) {
    this.peer = params.routingPeer;
    this.eventRecorder = params.eventRecorder;
    this.routeTimeout = params.routeTimeout;
    this.fullDumpInterval = params.fullDumpInterval;
  }

  updateNeighbourFullDumpTiming(nextHopPeerId: UUID, lastTick: number, interval: number) {
    this.fullDumpTimingByNeighbour.set(nextHopPeerId, {
      lastTick,
      interval,
    });
  }

  upsertSelfRoute(sequenceNumber: number) {
    const tick = this.eventRecorder.getCurrentTick();
    const previous = this.routes.get(this.peer.id) ?? null;
    const nextState: DsdvRouteState = {
      destinationPeerId: this.peer.id,
      nextHopPeerId: this.peer.id,
      metric: 0,
      sequenceNumber,
      lastUpdateTick: tick,
      deleteAfterTick: null,
      changed: true,
    };

    this.routes.set(this.peer.id, nextState);

    if (!previous) {
      this.eventRecorder.record(
        this.peer.id,
        EventType.AddRoute,
        {
          protocol: RoutingProtocol.DSDV,
          destinationPeerId: this.peer.id,
          nextHopPeerId: this.peer.id,
          previousRoute: null,
          nextRoute: this.toRecord(nextState),
        },
        RoutingProtocol.DSDV,
      );
      return;
    }

    this.eventRecorder.record(
      this.peer.id,
      EventType.UpdateRoute,
      {
        protocol: RoutingProtocol.DSDV,
        destinationPeerId: this.peer.id,
        nextHopPeerId: this.peer.id,
        previousRoute: this.toRecord(previous),
        nextRoute: this.toRecord(nextState),
      },
      RoutingProtocol.DSDV,
    );
  }

  processIncomingEntry(params: {
    senderPeerId: UUID;
    destinationPeerId: UUID;
    incomingMetric: number;
    incomingSequenceNumber: number;
    message: DsdvRouteUpdateMessage;
  }) {
    if (params.destinationPeerId === this.peer.id) {
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
    const routeTimeout = Math.max(1, this.routeTimeout);
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

    this.eventRecorder.record(
      this.peer.id,
      current ? EventType.UpdateRoute : EventType.AddRoute,
      {
        protocol: RoutingProtocol.DSDV,
        destinationPeerId: params.destinationPeerId,
        nextHopPeerId: params.senderPeerId,
        previousRoute: current ? this.toRecord(current) : null,
        nextRoute: this.toRecord(nextState),
        message: clone(params.message),
      },
      RoutingProtocol.DSDV,
    );

    return true;
  }

  tick() {
    const tick = this.eventRecorder.getCurrentTick();
    let changed = false;

    for (const [destinationPeerId, route] of this.routes.entries()) {
      if (destinationPeerId === this.peer.id) {
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

        this.eventRecorder.record(
          this.peer.id,
          EventType.DeleteRoute,
          {
            protocol: RoutingProtocol.DSDV,
            destinationPeerId: previousRoute.destinationPeerId,
            nextHopPeerId: previousRoute.nextHopPeerId,
            previousRoute,
            nextRoute: null,
          },
          RoutingProtocol.DSDV,
        );

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

        this.eventRecorder.record(
          this.peer.id,
          EventType.DeleteRoute,
          {
            protocol: RoutingProtocol.DSDV,
            destinationPeerId: previousRoute.destinationPeerId,
            nextHopPeerId: previousRoute.nextHopPeerId,
            previousRoute,
            nextRoute: null,
          },
          RoutingProtocol.DSDV,
        );
      }
    }

    return changed;
  }

  private getRouteExpiryTick(nextHopPeerId: UUID, fallbackTick: number): number {
    const fullDumpTiming = this.fullDumpTimingByNeighbour.get(nextHopPeerId);
    const fullDumpInterval = fullDumpTiming?.interval ?? this.fullDumpInterval;
    const lastFullDumpTick = fullDumpTiming?.lastTick ?? fallbackTick;
    return lastFullDumpTick + fullDumpInterval + this.routeTimeout;
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
