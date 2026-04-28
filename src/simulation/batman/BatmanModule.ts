import { RoutingProtocol } from "../../types/enums";
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

const BATMAN_TIME_TO_LIVE = 50;
const BATMAN_WINDOW_SIZE = 64;
const BATMAN_MAX_QUALITY = 255;

const cloneMessage = <T extends SimulationMessage>(message: T): T => {
  return { ...message };
};

class BatmanQualityWindow {
  private readonly bits = Array<boolean>(BATMAN_WINDOW_SIZE).fill(false);

  private lastSequence: number | null = null;

  process(sequence: number) {
    if (this.lastSequence === null) {
      this.lastSequence = sequence;
      this.bits[0] = true;
      return true;
    }

    const diff = sequence - this.lastSequence;
    if (diff <= 0 && Math.abs(diff) < BATMAN_WINDOW_SIZE) {
      const index = Math.abs(diff);
      if (this.bits[index]) {
        return false;
      }

      this.bits[index] = true;
      return true;
    }

    if (diff > 0) {
      if (diff >= BATMAN_WINDOW_SIZE) {
        this.bits.fill(false);
      } else {
        for (let index = BATMAN_WINDOW_SIZE - 1; index >= diff; index -= 1) {
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

  processGap() {
    if (this.lastSequence === null) {
      return;
    }

    for (let index = BATMAN_WINDOW_SIZE - 1; index >= 1; index -= 1) {
      this.bits[index] = this.bits[index - 1];
    }
    this.bits[0] = false;
  }

  getQuality() {
    const receivedCount = this.bits.reduce((count, bit) => count + Number(bit), 0);
    return Math.floor((receivedCount * BATMAN_MAX_QUALITY) / BATMAN_WINDOW_SIZE);
  }

  toString() {
    return this.bits.map((bit) => (bit ? "1" : "0")).join("");
  }
}

type BatmanRoute = {
  hopPeerId: string;
  qualityWindow: BatmanQualityWindow;
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

  process(originatorPeerId: string, hopPeerId: string, message: BatmanOriginatorMessage) {
    const routes = this.originators.get(originatorPeerId);
    if (!routes || !routes.has(hopPeerId)) {
      this.insert(originatorPeerId, hopPeerId, message);
    }

    return this.update(originatorPeerId, hopPeerId, message);
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
            reason: `Route expired after ${this.purgeTimeout} ticks without updates`,
          });
          continue;
        }

        if (route.lastTick === tick) {
          continue;
        }

        route.qualityWindow.processGap();
        const nextRoute = this.toRouteRecord(originatorPeerId, route);
        if (previousRoute.quality !== nextRoute.quality) {
          this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
            originatorPeerId,
            hopPeerId,
            previousRoute,
            nextRoute,
            reason: "Quality window shifted because no OGM was received during the tick",
          });
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

      const selectedQuality = selected.qualityWindow.getQuality();
      const routeQuality = route.qualityWindow.getQuality();
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

  private insert(originatorPeerId: string, hopPeerId: string, message: BatmanOriginatorMessage) {
    const route: BatmanRoute = {
      hopPeerId,
      qualityWindow: new BatmanQualityWindow(),
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
      reason: "First OGM discovered a new originator via this hop",
    });
  }

  private update(originatorPeerId: string, hopPeerId: string, message: BatmanOriginatorMessage) {
    const route = this.originators.get(originatorPeerId)?.get(hopPeerId);
    if (!route) {
      return false;
    }

    const previousRoute = this.toRouteRecord(originatorPeerId, route);
    route.lastTick = this.eventRecorder.getCurrentTick();
    const processed = route.qualityWindow.process(message.sequence);
    if (processed) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
        originatorPeerId,
        hopPeerId,
        previousRoute,
        nextRoute: this.toRouteRecord(originatorPeerId, route),
        message: cloneMessage(message),
        reason: "OGM updated the BATMAN quality window",
      });
    }

    return processed;
  }

  private toRouteRecord(originatorPeerId: string, route: BatmanRoute): BatmanRouteRecord {
    return {
      originatorPeerId,
      hopPeerId: route.hopPeerId,
      quality: route.qualityWindow.getQuality(),
      qualityWindow: route.qualityWindow.toString(),
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
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      sequence: this.sequence,
      timeToLive: BATMAN_TIME_TO_LIVE,
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
        reason: "Source peer is disabled",
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

    const nextTimeToLive = message.timeToLive - 1;
    if (nextTimeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: "BATMAN OGM TTL reached zero",
      });
      return false;
    }

    const processed = this.originatorTable.process(
      message.sourcePeerId,
      message.senderPeerId,
      message,
    );
    if (!processed) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: "Duplicate BATMAN OGM was ignored by the quality window",
      });
      return true;
    }

    const forwarded: BatmanOriginatorMessage = {
      ...message,
      senderPeerId: this.routingPeer.id,
      timeToLive: nextTimeToLive,
    };
    return this.broadcast(forwarded);
  }

  private routeAndWrite(packet: SimulationPacket) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(packet),
        reason: "Packet TTL reached zero",
      });
      return false;
    }

    const nextHopPeerId = this.originatorTable.getMaxQualityHop(packet.destinationPeerId);
    if (!nextHopPeerId) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(packet),
        reason: "No BATMAN route is available for the destination",
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
        reason: "Selected next hop is not a current neighbour",
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.BATMAN)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: "Selected next hop does not support BATMAN",
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
