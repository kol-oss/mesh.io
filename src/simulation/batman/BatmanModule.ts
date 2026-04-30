import { RoutingProtocol } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  SimulationEventType,
  SimulationMessageKind,
  type BatmanEchoLocationMessage,
  type BatmanEchoLocationNeighbour,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type BatmanRouteRecord,
  type ThroughputCalculationEventDetails,
  type SimulationMessage,
  type SimulationPacket,
} from "../../types/simulation";
import { SimulationEventRecorder } from "../core/EventRecorder";
import type { PacketCapableModule, SimulationPeerNode } from "../core/runtimeTypes";

const BATMAN_V_VERSION = 5;
const BATMAN_TIME_TO_LIVE = 50;
const BATMAN_PROTECTION_WINDOW = 64;
const BATMAN_MAX_THROUGHPUT = 2 ** 32;
const BATMAN_WIRELESS_BASE_THROUGHPUT = 100;
const BATMAN_STATIC_BASE_THROUGHPUT = 1000;
const BATMAN_ELP_EWMA_ALPHA = 0.2;
const BATMAN_OGM_HOP_PENALTY_PERCENT = 5.8;

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

type BatmanNeighbourEntry = {
  neighbourId: string;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
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
    reason: string,
  ) {
    const previousBestRoute = this.getBestRoute(originatorPeerId);
    const routes = this.originators.get(originatorPeerId);
    if (!routes || !routes.has(hopPeerId)) {
      this.insert(originatorPeerId, hopPeerId, message, throughput, reason);
    }

    const accepted = this.update(originatorPeerId, hopPeerId, message, throughput, reason);
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
    reason: string,
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
      reason,
    });
  }

  private update(
    originatorPeerId: string,
    hopPeerId: string,
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
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
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

  private ogmSequence = 0;

  private elpSequence = 0;

  private lastElpTickSent: number | null = null;

  private readonly neighbourTable = new Map<string, BatmanNeighbourEntry>();

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
      return this.routeAndWrite(forwardedPacket);
    }

    if (message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
      return this.processEchoLocation(message);
    }

    return this.process(message);
  }

  refresh() {
    this.refreshElp();
    this.refreshOgm();
  }

  refreshElp() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.broadcastElp();
  }

  refreshOgm() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.ogmSequence += 1;
    const message: BatmanOriginatorMessage = {
      kind: SimulationMessageKind.BatmanOriginatorMessage,
      version: BATMAN_V_VERSION,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      sequence: this.ogmSequence,
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

  getNeighboursTable(): BatmanNeighbourRecord[] {
    return [...this.neighbourTable.values()]
      .map((entry) => ({
        neighbourPeerId: entry.neighbourId,
        quality: clampThroughput(entry.ewmaThroughput),
        lastTick: entry.lastSeen,
        interval: entry.lastInterval,
      }))
      .sort((left, right) => left.neighbourPeerId.localeCompare(right.neighbourPeerId));
  }

  private process(message: BatmanOriginatorMessage) {
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

    const neighbourEntry = this.neighbourTable.get(message.senderPeerId);
    if (!neighbourEntry) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmDroppedNoElpMetric,
      });
      return false;
    }

    const receivedThroughput = clampThroughput(message.throughput);
    const neighbourThroughput = clampThroughput(neighbourEntry.ewmaThroughput);
    const selectedThroughput = Math.min(receivedThroughput, neighbourThroughput);
    const isStaticHop = this.routingPeer.isLinkedNeighbour(message.senderPeerId);
    const isWirelessHop = !isStaticHop && this.routingPeer.isRangedNeighbour(message.senderPeerId);
    const nextThroughput = isWirelessHop
      ? applyFixedHopPenalty(selectedThroughput)
      : selectedThroughput;
    const reason = ui.runtime.ogmThroughputSelected(
      receivedThroughput,
      neighbourThroughput,
      selectedThroughput,
      nextThroughput,
      isWirelessHop,
    );
    this.recordThroughputCalculated(message, reason, undefined, {
      receivedThroughput,
      neighbourThroughput,
      selectedThroughput,
      isWirelessHop,
      hopPenaltyPercent: BATMAN_OGM_HOP_PENALTY_PERCENT,
      forwardedThroughput: nextThroughput,
    });

    const processed = this.originatorTable.process(
      message.sourcePeerId,
      message.senderPeerId,
      message,
      nextThroughput,
      reason,
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

  private broadcast(message: BatmanOriginatorMessage | BatmanEchoLocationMessage) {
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

  private broadcastElp() {
    const currentTick = this.eventRecorder.getCurrentTick();
    if (this.lastElpTickSent === currentTick) {
      return;
    }

    this.lastElpTickSent = currentTick;
    this.elpSequence += 1;
    const elpInterval = Math.max(1, Math.floor(this.routingPeer.getPeerEntity().batmanElpInterval));

    const neighbours: BatmanEchoLocationNeighbour[] = [...this.neighbourTable.values()]
      .map((entry) => ({
        address: entry.neighbourId,
      }))
      .sort((left, right) => left.address.localeCompare(right.address));

    const elpMessage: BatmanEchoLocationMessage = {
      kind: SimulationMessageKind.BatmanEchoLocationMessage,
      packetType: "ELP",
      version: BATMAN_V_VERSION,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      timeToLive: BATMAN_TIME_TO_LIVE,
      numNeighbours: neighbours.length,
      sequence: this.elpSequence,
      interval: elpInterval,
      neighbours,
    };

    this.broadcast(elpMessage);
  }

  private processEchoLocation(message: BatmanEchoLocationMessage) {
    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    if (message.version !== BATMAN_V_VERSION) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.elpUnsupportedVersion(message.version),
      });
      return false;
    }

    if (message.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.elpTtlReachedZero,
      });
      return false;
    }

    const senderPeer = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!senderPeer) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.nextHopNotNeighbour,
      });
      return false;
    }

    const routingPeerEntity = this.routingPeer.getPeerEntity();
    const senderPeerEntity = senderPeer.getPeerEntity();
    const isStaticLink = this.routingPeer.isLinkedNeighbour(message.senderPeerId);
    const isWirelessLink =
      !isStaticLink && this.routingPeer.isRangedNeighbour(message.senderPeerId);
    const distance = getDistanceBetweenPeers(routingPeerEntity, senderPeerEntity);
    const baseReferenceThroughput = isWirelessLink
      ? BATMAN_WIRELESS_BASE_THROUGHPUT
      : BATMAN_STATIC_BASE_THROUGHPUT;
    const baseThroughput = isWirelessLink
      ? applyDistancePenalty(
          baseReferenceThroughput,
          distance,
          routingPeerEntity.batmanDistancePenaltyDistance,
          routingPeerEntity.batmanDistancePenaltyPercent,
        )
      : baseReferenceThroughput;

    const previous = this.neighbourTable.get(message.senderPeerId);
    const currentTick = this.eventRecorder.getCurrentTick();
    const tickGap = previous ? Math.max(1, currentTick - previous.lastSeen) : 1;
    const expectedGap = previous ? Math.max(1, previous.lastInterval) : 1;
    const receptionRatio = Math.min(1, expectedGap / tickGap);

    const rawMetric = baseThroughput * receptionRatio;

    const nextEwma = previous
      ? BATMAN_ELP_EWMA_ALPHA * rawMetric + (1 - BATMAN_ELP_EWMA_ALPHA) * previous.ewmaThroughput
      : rawMetric;
    const reason = ui.runtime.elpThroughputCalculated(
      baseThroughput,
      receptionRatio,
      rawMetric,
      previous?.ewmaThroughput ?? null,
      nextEwma,
    );
    this.recordThroughputCalculated(message, reason, {
      baseThroughput,
      baseReferenceThroughput,
      receptionRatio,
      rawThroughput: rawMetric,
      previousEwma: previous?.ewmaThroughput ?? null,
      nextEwma,
      distance,
      distancePenaltyDistance: routingPeerEntity.batmanDistancePenaltyDistance,
      distancePenaltyPercent: routingPeerEntity.batmanDistancePenaltyPercent,
    });

    this.neighbourTable.set(message.senderPeerId, {
      neighbourId: message.senderPeerId,
      lastSeen: currentTick,
      lastInterval: Math.max(1, Math.floor(message.interval)),
      ewmaThroughput: clampThroughput(nextEwma),
    });

    return true;
  }

  private recordThroughputCalculated(
    message: SimulationMessage,
    reason: string,
    breakdown?: ThroughputCalculationEventDetails["breakdown"],
    ogmSelection?: ThroughputCalculationEventDetails["ogmSelection"],
  ) {
    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemThroughputCalculated, {
      message: cloneMessage(message),
      reason,
      breakdown,
      ogmSelection,
    });
  }
}

const isSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.BatmanOriginatorMessage ||
    candidate.kind === SimulationMessageKind.BatmanEchoLocationMessage
  );
};

const clampThroughput = (throughput: number) => {
  if (!Number.isFinite(throughput)) {
    return BATMAN_MAX_THROUGHPUT;
  }

  return Math.max(0, Math.min(BATMAN_MAX_THROUGHPUT, Math.floor(throughput)));
};

const getDistanceBetweenPeers = (
  sourcePeer: { x: number; y: number },
  destinationPeer: { x: number; y: number },
) => {
  return Math.hypot(destinationPeer.x - sourcePeer.x, destinationPeer.y - sourcePeer.y);
};

const applyDistancePenalty = (
  throughput: number,
  distance: number,
  distancePenaltyDistance: number,
  distancePenaltyPercent: number,
) => {
  if (!Number.isFinite(distancePenaltyPercent) || distancePenaltyPercent <= 0) {
    return throughput;
  }

  const normalizedDistance = Math.max(1, distancePenaltyDistance);
  const excessDistance = Math.max(0, distance - normalizedDistance);
  const multiplier = excessDistance / normalizedDistance;
  const effectivePenalty = distancePenaltyPercent * multiplier;
  const penalized = throughput * ((100 - effectivePenalty) / 100);
  return Math.max(0, Math.floor(penalized));
};

const applyFixedHopPenalty = (throughput: number) => {
  const penalized = throughput * ((100 - BATMAN_OGM_HOP_PENALTY_PERCENT) / 100);
  return Math.max(0, Math.floor(penalized));
};
