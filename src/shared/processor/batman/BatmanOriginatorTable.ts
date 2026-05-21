import { EventRecorder } from "@/shared/processor/core/EventRecorder";
import type { PeerNode } from "@/shared/processor/core/runtimeTypes";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import {
  EventType,
  type BatmanOriginatorMessage,
  type BatmanRouteRecord,
} from "@/shared/types/model/simulation";
import { cloneMessage } from "./batmanMessage";
import { BatmanSequenceWindow } from "./BatmanSequenceWindow";

type BatmanRoute = {
  hopPeerId: UUID;
  throughput: number;
  sequenceWindow: BatmanSequenceWindow;
  lastTick: number;
};

export class BatmanOriginatorTable {
  private readonly originators = new Map<UUID, Map<UUID, BatmanRoute>>();

  private readonly routingPeer: PeerNode;

  private readonly eventRecorder: EventRecorder;

  private readonly purgeTimeout: number;

  private readonly onRouteDeleted?: (hopPeerId: UUID) => void;

  constructor(
    routingPeer: PeerNode,
    eventRecorder: EventRecorder,
    purgeTimeout: number,
    onRouteDeleted?: (hopPeerId: UUID) => void,
  ) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
    this.purgeTimeout = purgeTimeout;
    this.onRouteDeleted = onRouteDeleted;
  }

  process(
    originatorPeerId: UUID,
    hopPeerId: UUID,
    message: BatmanOriginatorMessage,
    throughput: number,
    reason: string,
  ) {
    const previousBestRoute = this.getBestRoute(originatorPeerId);
    const routes = this.originators.get(originatorPeerId);

    let accepted = true;
    if (!routes || !routes.has(hopPeerId)) {
      this.insert(originatorPeerId, hopPeerId, message, throughput, reason);
    } else {
      accepted = this.update(originatorPeerId, hopPeerId, message, throughput, reason);
    }
    const nextBestRoute = this.getBestRoute(originatorPeerId);

    return {
      accepted,
      previousBestHopPeerId: previousBestRoute?.hopPeerId ?? null,
      previousBestThroughput: previousBestRoute?.throughput ?? 0,
      nextBestHopPeerId: nextBestRoute?.hopPeerId ?? null,
      nextBestThroughput: nextBestRoute?.throughput ?? 0,
    };
  }

  tick() {
    const tick = this.eventRecorder.getCurrentTick();

    for (const [originatorPeerId, routes] of this.originators.entries()) {
      for (const [hopPeerId, route] of routes.entries()) {
        const previousRoute = this.toRouteRecord(originatorPeerId, route);
        if (tick - route.lastTick > this.purgeTimeout) {
          routes.delete(hopPeerId);
          if (!this.hasRouteViaHop(hopPeerId)) {
            this.onRouteDeleted?.(hopPeerId);
          }
          this.eventRecorder.record(this.routingPeer.id, EventType.DeleteRoute, {
            protocol: RoutingProtocol.BATMAN,
            originatorPeerId,
            hopPeerId,
            previousRoute,
            nextRoute: null,
            reason: `Route expired after ${this.purgeTimeout} (this.purgeTimeout) without updates`,
          });
          continue;
        }

        if (route.lastTick === tick) {
          continue;
        }
      }

      if (routes.size === 0) {
        this.originators.delete(originatorPeerId);
      }
    }
  }

  getMaxQualityHop(originatorPeerId: UUID) {
    const selected = this.getBestRoute(originatorPeerId);
    return selected?.hopPeerId ?? null;
  }

  getBestRouteRecord(originatorPeerId: UUID): BatmanRouteRecord | null {
    const bestRoute = this.getBestRoute(originatorPeerId);
    return bestRoute ? this.toRouteRecord(originatorPeerId, bestRoute) : null;
  }

  getRoutes() {
    const result: BatmanRouteRecord[] = [];
    for (const [originatorPeerId, routes] of this.originators.entries()) {
      for (const route of routes.values()) {
        result.push(this.toRouteRecord(originatorPeerId, route));
      }
    }

    return result.sort((left, right) => {
      if (left.originatorPeerId !== right.originatorPeerId) {
        return left.originatorPeerId.localeCompare(right.originatorPeerId);
      }

      return left.hopPeerId.localeCompare(right.hopPeerId);
    });
  }

  private getBestRoute(originatorPeerId: UUID): BatmanRoute | null {
    const routes = this.originators.get(originatorPeerId);
    if (!routes || routes.size === 0) {
      return null;
    }

    let selected: BatmanRoute | null = null;
    for (const route of routes.values()) {
      if (!selected || route.throughput > selected.throughput) {
        selected = route;
        continue;
      }

      if (route.throughput === selected.throughput && route.hopPeerId === originatorPeerId) {
        selected = route;
      }
    }

    return selected;
  }

  private hasRouteViaHop(hopPeerId: UUID) {
    for (const routes of this.originators.values()) {
      if (routes.has(hopPeerId)) {
        return true;
      }
    }

    return false;
  }

  private insert(
    originatorPeerId: UUID,
    hopPeerId: UUID,
    message: BatmanOriginatorMessage,
    throughput: number,
    reason: string,
  ) {
    const route: BatmanRoute = {
      hopPeerId,
      throughput,
      sequenceWindow: new BatmanSequenceWindow(),
      lastTick: this.eventRecorder.getCurrentTick(),
    };

    const routes = this.originators.get(originatorPeerId) ?? new Map<UUID, BatmanRoute>();
    routes.set(hopPeerId, route);
    this.originators.set(originatorPeerId, routes);
    route.sequenceWindow.process(message.sequence);

    this.eventRecorder.record(this.routingPeer.id, EventType.AddRoute, {
      protocol: RoutingProtocol.BATMAN,
      originatorPeerId,
      hopPeerId,
      previousRoute: null,
      nextRoute: this.toRouteRecord(originatorPeerId, route),
      message: cloneMessage(message),
      reason,
    });
  }

  private update(
    originatorPeerId: UUID,
    hopPeerId: UUID,
    message: BatmanOriginatorMessage,
    throughput: number,
    reason: string,
  ) {
    const route = this.originators.get(originatorPeerId)?.get(hopPeerId);
    if (!route) {
      return false;
    }

    const previousRoute = this.toRouteRecord(originatorPeerId, route);
    route.lastTick = this.eventRecorder.getCurrentTick();
    const processed = route.sequenceWindow.process(message.sequence);
    if (processed) {
      route.throughput = throughput;
      this.eventRecorder.record(this.routingPeer.id, EventType.UpdateRoute, {
        protocol: RoutingProtocol.BATMAN,
        originatorPeerId,
        hopPeerId,
        previousRoute,
        nextRoute: this.toRouteRecord(originatorPeerId, route),
        message: cloneMessage(message),
        reason,
      });
    }

    return processed;
  }

  private toRouteRecord(originatorPeerId: UUID, route: BatmanRoute): BatmanRouteRecord {
    return {
      originatorPeerId,
      hopPeerId: route.hopPeerId,
      quality: route.throughput,
      qualityWindow: route.sequenceWindow.toArray(),
      lastTick: route.lastTick,
    };
  }
}
