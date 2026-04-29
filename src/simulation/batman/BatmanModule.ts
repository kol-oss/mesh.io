import { RoutingProtocol } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  SimulationEventType,
  SimulationMessageKind,
  type BatmanOriginatorMessage,
  type BatmanRouteRecord,
  type SimulationMessage,
  type SimulationPacket,
} from "../../types/simulation";
import { SimulationEventRecorder } from "../core/EventRecorder";
import type { PacketCapableModule, SimulationPeerNode } from "../core/runtimeTypes";

const BATMAN_V_VERSION = 5;
const BATMAN_TIME_TO_LIVE = 50;
const BATMAN_PROTECTION_WINDOW = 64;
const BATMAN_MAX_THROUGHPUT = 255;
const BATMAN_HOP_PENALTY_PERCENT = 5.8;

const cloneMessage = <T extends SimulationMessage>(message: T): T => {
  return { ...message };
};

class BatmanSequenceWindow {
  private readonly bits = Array<boolean>(BATMAN_PROTECTION_WINDOW).fill(false);

  private lastSequence: number | null = null;

  process(sequence: number) {
    if (this.lastSequence === null) {
      this.lastSequence = sequence;
      this.bits[0] = true;
      return true;
    }

    const diff = sequence - this.lastSequence;
    if (diff <= 0 && Math.abs(diff) < BATMAN_PROTECTION_WINDOW) {
      const index = Math.abs(diff);
      if (this.bits[index]) {
        return false;
      }

      this.bits[index] = true;
      return true;
    }

    if (diff > 0) {
      if (diff >= BATMAN_PROTECTION_WINDOW) {
        this.bits.fill(false);
      } else {
        for (let index = BATMAN_PROTECTION_WINDOW - 1; index >= diff; index -= 1) {
          this.bits[index] = this.bits[index - diff];
        }

        for (let index = 0; index < diff; index += 1) {
          this.bits[index] = false;
        }
      }

      this.bits[0] = true;
      this.lastSequence = sequence;
    }

    return true;
  }

  toString() {
    return this.bits.map((bit) => (bit ? "1" : "0")).join("");
  }
}

type BatmanRoute = {
  hopPeerId: string;
  throughput: number;
  sequenceWindow: BatmanSequenceWindow;
  lastTick: number;
};

class BatmanOriginatorTable {
  private readonly originators = new Map<string, Map<string, BatmanRoute>>();

  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private readonly purgeTimeout: number;

  constructor(
    routingPeer: SimulationPeerNode,
    eventRecorder: SimulationEventRecorder,
    purgeTimeout: number,
  ) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
    this.purgeTimeout = purgeTimeout;
  }

  process(
    originatorPeerId: string,
    hopPeerId: string,
    message: BatmanOriginatorMessage,
    throughput: number,
  ) {
    const previousBestRoute = this.getBestRoute(originatorPeerId);
    const routes = this.originators.get(originatorPeerId);
    if (!routes || !routes.has(hopPeerId)) {
      this.insert(originatorPeerId, hopPeerId, message, throughput);
    }

    const accepted = this.update(originatorPeerId, hopPeerId, message, throughput);
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
          this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableRemove, {
            originatorPeerId,
            hopPeerId,
            previousRoute,
            nextRoute: null,
            reason: ui.runtime.routeExpiredAfterTicks(this.purgeTimeout),
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

  getMaxQualityHop(originatorPeerId: string) {
    const routes = this.originators.get(originatorPeerId);
    if (!routes || routes.size === 0) {
      return null;
    }

    let selected: BatmanRoute | null = null;
    for (const route of routes.values()) {
      if (!selected) {
        selected = route;
        continue;
      }

      const selectedQuality = selected.throughput;
      const routeQuality = route.throughput;
      if (routeQuality > selectedQuality) {
        selected = route;
        continue;
      }

      if (routeQuality === selectedQuality && route.hopPeerId === originatorPeerId) {
        selected = route;
      }
    }

    return selected?.hopPeerId ?? null;
  }

  private getBestRoute(originatorPeerId: string): BatmanRoute | null {
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

  private insert(
    originatorPeerId: string,
    hopPeerId: string,
    message: BatmanOriginatorMessage,
    throughput: number,
  ) {
    const route: BatmanRoute = {
      hopPeerId,
      throughput,
      sequenceWindow: new BatmanSequenceWindow(),
      lastTick: this.eventRecorder.getCurrentTick(),
    };

    const routes = this.originators.get(originatorPeerId) ?? new Map<string, BatmanRoute>();
    routes.set(hopPeerId, route);
    this.originators.set(originatorPeerId, routes);

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableInsert, {
      originatorPeerId,
      hopPeerId,
      previousRoute: null,
      nextRoute: this.toRouteRecord(originatorPeerId, route),
      message: cloneMessage(message),
      reason: ui.runtime.firstOgmDiscoveredOriginator,
    });
  }

  private update(
    originatorPeerId: string,
    hopPeerId: string,
    message: BatmanOriginatorMessage,
    throughput: number,
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
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
        originatorPeerId,
        hopPeerId,
        previousRoute,
        nextRoute: this.toRouteRecord(originatorPeerId, route),
        message: cloneMessage(message),
        reason: ui.runtime.ogmUpdatedThroughput,
      });
    }

    return processed;
  }

  private toRouteRecord(originatorPeerId: string, route: BatmanRoute): BatmanRouteRecord {
    return {
      originatorPeerId,
      hopPeerId: route.hopPeerId,
      quality: route.throughput,
      qualityWindow: route.sequenceWindow.toString(),
      lastTick: route.lastTick,
    };
  }
}

export class BatmanModule implements PacketCapableModule {
  private readonly originatorTable: BatmanOriginatorTable;

  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private sequence = 0;

  constructor(routingPeer: SimulationPeerNode, eventRecorder: SimulationEventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
    this.originatorTable = new BatmanOriginatorTable(
      routingPeer,
      eventRecorder,
      Math.max(1, routingPeer.getPeerEntity().batmanPurgeTimeout),
    );
  }

  read(message: unknown): boolean {
    if (!isSimulationMessage(message)) {
      return false;
    }

    if (message.kind === SimulationMessageKind.Packet) {
      if (message.destinationPeerId === this.routingPeer.id) {
        return true;
      }

      const forwardedPacket: SimulationPacket = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.process(forwardedPacket);
    }

    return this.process(message);
  }

  refresh() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.sequence += 1;
    const message: BatmanOriginatorMessage = {
      kind: SimulationMessageKind.BatmanOriginatorMessage,
      version: BATMAN_V_VERSION,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      sequence: this.sequence,
      timeToLive: BATMAN_TIME_TO_LIVE,
      throughput: BATMAN_MAX_THROUGHPUT,
    };

    this.broadcast(message);
  }

  tick() {
    this.originatorTable.tick();
  }

  send(packet: SimulationPacket) {
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(packet),
        reason: ui.runtime.sourcePeerDisabled,
      });
      return false;
    }

    let remainingRetries = 1;
    let result = false;

    while (!result && remainingRetries-- > 0) {
      result = this.routeAndWrite(packet);
    }

    return result;
  }

  getRoutes() {
    return this.originatorTable.getRoutes();
  }

  private process(message: SimulationMessage) {
    if (message.kind === SimulationMessageKind.Packet) {
      return this.routeAndWrite(message);
    }

    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    if (message.version !== BATMAN_V_VERSION) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmUnsupportedVersion(message.version),
      });
      return false;
    }

    const nextTimeToLive = message.timeToLive - 1;
    if (nextTimeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmTtlReachedZero,
      });
      return false;
    }

    const nextThroughput = applyHopPenalty(clampThroughput(message.throughput));
    const processed = this.originatorTable.process(
      message.sourcePeerId,
      message.senderPeerId,
      message,
      nextThroughput,
    );
    if (!processed.accepted) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.duplicateOgmIgnored,
      });
      return true;
    }

    const rebroadcastAllowedByBestPath =
      processed.previousBestHopPeerId === null ||
      processed.previousBestHopPeerId === message.senderPeerId ||
      nextThroughput > processed.previousBestThroughput;

    if (!rebroadcastAllowedByBestPath) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmSuppressedInferiorPath,
      });
      return true;
    }

    const forwarded: BatmanOriginatorMessage = {
      ...message,
      senderPeerId: this.routingPeer.id,
      timeToLive: nextTimeToLive,
      throughput: nextThroughput,
    };
    return this.broadcast(forwarded);
  }

  private routeAndWrite(packet: SimulationPacket) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(packet),
        reason: ui.runtime.packetTtlReachedZero,
      });
      return false;
    }

    const nextHopPeerId = this.originatorTable.getMaxQualityHop(packet.destinationPeerId);
    if (!nextHopPeerId) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(packet),
        reason: ui.runtime.noRouteForDestination,
      });
      return false;
    }

    return this.write(packet, nextHopPeerId);
  }

  private write(message: SimulationMessage, hopPeerId: string) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.nextHopNotNeighbour,
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.BATMAN)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.nextHopNoBatman,
      });
      return false;
    }

    const forwardedMessage =
      message.kind === SimulationMessageKind.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : cloneMessage(message);

    const targetModule = hop.getModule(RoutingProtocol.BATMAN);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  private broadcast(message: BatmanOriginatorMessage) {
    const neighbours = this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.BATMAN));

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
      neighbourPeerIds: neighbours.map((peer) => peer.id),
      retransmit: message.sourcePeerId !== this.routingPeer.id,
      message: cloneMessage(message),
    });

    let broadcastResult = true;
    for (const neighbour of neighbours) {
      const result = this.write(message, neighbour.id);
      broadcastResult = broadcastResult && result;
    }

    return broadcastResult;
  }
}

const isSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.BatmanOriginatorMessage
  );
};

const clampThroughput = (throughput: number) => {
  if (!Number.isFinite(throughput)) {
    return BATMAN_MAX_THROUGHPUT;
  }

  return Math.max(0, Math.min(BATMAN_MAX_THROUGHPUT, Math.floor(throughput)));
};

const applyHopPenalty = (throughput: number) => {
  const penalized = throughput * ((100 - BATMAN_HOP_PENALTY_PERCENT) / 100);
  return Math.max(0, Math.floor(penalized));
};
