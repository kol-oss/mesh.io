import { OLSR_DEFAULT_TC_TTL, OLSR_MAX_INTERVAL, OLSR_MIN_INTERVAL } from "../../constants/olsr";
import { ui } from "../../i18n/messages";
import { RoutingProtocol } from "../../types/enums";
import {
  SimulationEventType,
  SimulationMessageKind,
  type OlsrHelloMessage,
  type OlsrNeighbourRecord,
  type OlsrRouteRecord,
  type OlsrTcMessage,
  type OlsrTopologyRecord,
  type SimulationMessage,
  type SimulationPacket,
} from "../../types/simulation";
import type { UUID } from "../../types/uuid";
import { SimulationEventRecorder } from "../core/EventRecorder";
import type { PacketCapableModule, SimulationPeerNode } from "../core/runtimeTypes";
import { cloneOlsrMessage, isOlsrSimulationMessage } from "./olsrMessage";

type OlsrTopologyEntry = {
  destinationPeerId: UUID;
  lastHopPeerId: UUID;
  sequenceNumber: number;
  lastUpdateTick: number;
};

const clampInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(OLSR_MIN_INTERVAL, Math.min(OLSR_MAX_INTERVAL, normalized));
};

export class OlsrModule implements PacketCapableModule {
  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private readonly neighbourTable = new Map<UUID, OlsrNeighbourRecord>();

  private readonly selectorPeerIds = new Set<UUID>();

  private readonly mprPeerIds = new Set<UUID>();

  private readonly topologyEntries = new Map<string, OlsrTopologyEntry>();

  private readonly routingTable = new Map<UUID, OlsrRouteRecord>();

  private readonly lastTcSequenceByOriginator = new Map<UUID, number>();

  private ansn = 0;

  constructor(routingPeer: SimulationPeerNode, eventRecorder: SimulationEventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
  }

  read(message: unknown): boolean {
    if (!isOlsrSimulationMessage(message)) {
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

    if (message.kind === SimulationMessageKind.OlsrHelloMessage) {
      return this.processHello(message);
    }

    if (message.kind === SimulationMessageKind.OlsrTcMessage) {
      return this.processTc(message);
    }

    return false;
  }

  refresh() {
    this.refreshHello();
    this.refreshTc();
  }

  refreshHello() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.recomputeMprSet();

    const helloMessage: OlsrHelloMessage = {
      kind: SimulationMessageKind.OlsrHelloMessage,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      interval: clampInterval(this.routingPeer.getPeerEntity().olsrHelloInterval),
      neighbours: this.getSymmetricNeighbours().map((peer) => peer.id),
      mprPeerIds: [...this.mprPeerIds],
    };

    this.broadcastControlMessage(
      helloMessage,
      false,
      "HELLO broadcast refreshed local symmetric links and MPR announcements.",
    );
    this.recomputeRoutingTable(
      "Recomputed OLSR routes after local HELLO neighbour sensing and MPR selection.",
      helloMessage,
    );
  }

  refreshTc() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    if (this.selectorPeerIds.size === 0) {
      return;
    }

    this.ansn += 1;
    const tcMessage: OlsrTcMessage = {
      kind: SimulationMessageKind.OlsrTcMessage,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      ansn: this.ansn,
      timeToLive: OLSR_DEFAULT_TC_TTL,
      advertisedNeighbours: [...this.selectorPeerIds],
    };

    this.broadcastControlMessage(
      tcMessage,
      false,
      "TC broadcast advertised this node's current MPR selectors.",
    );
  }

  tick() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    const tick = this.eventRecorder.getCurrentTick();
    const helloExpiry = clampInterval(this.routingPeer.getPeerEntity().olsrHelloInterval) * 3;
    const tcExpiry = clampInterval(this.routingPeer.getPeerEntity().olsrTcInterval) * 3;

    let changed = false;

    for (const [peerId, neighbour] of this.neighbourTable.entries()) {
      if (tick - neighbour.lastUpdateTick > helloExpiry) {
        this.neighbourTable.delete(peerId);
        this.selectorPeerIds.delete(peerId);
        this.mprPeerIds.delete(peerId);
        changed = true;
      }
    }

    for (const [key, topology] of this.topologyEntries.entries()) {
      if (tick - topology.lastUpdateTick > tcExpiry) {
        this.topologyEntries.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.recomputeMprSet();
      this.recomputeRoutingTable(
        "Recomputed OLSR routes after stale neighbour/topology entries expired.",
        null,
      );
    }
  }

  send(packet: SimulationPacket): boolean {
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneOlsrMessage(packet),
        reason: ui.runtime.sourcePeerDisabled,
      });
      return false;
    }

    return this.routeAndWrite(packet);
  }

  getNeighbourTable() {
    return [...this.neighbourTable.values()].sort((left, right) =>
      left.neighbourPeerId.localeCompare(right.neighbourPeerId),
    );
  }

  getTopologyTable() {
    return [...this.topologyEntries.values()]
      .map(
        (entry): OlsrTopologyRecord => ({
          destinationPeerId: entry.destinationPeerId,
          lastHopPeerId: entry.lastHopPeerId,
          sequenceNumber: entry.sequenceNumber,
          lastUpdateTick: entry.lastUpdateTick,
        }),
      )
      .sort((left, right) => left.destinationPeerId.localeCompare(right.destinationPeerId));
  }

  getRoutes() {
    return [...this.routingTable.values()].sort((left, right) =>
      left.destinationPeerId.localeCompare(right.destinationPeerId),
    );
  }

  private processHello(message: OlsrHelloMessage) {
    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    const sender = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.OLSR)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneOlsrMessage(message),
        reason: ui.runtime.nextHopNoOlsr,
      });
      return false;
    }

    const tick = this.eventRecorder.getCurrentTick();
    this.neighbourTable.set(message.senderPeerId, {
      neighbourPeerId: message.senderPeerId,
      status: this.mprPeerIds.has(message.senderPeerId) ? "MPR" : "SYMMETRIC",
      lastUpdateTick: tick,
    });

    if (message.mprPeerIds.includes(this.routingPeer.id)) {
      this.selectorPeerIds.add(message.senderPeerId);
    } else {
      this.selectorPeerIds.delete(message.senderPeerId);
    }

    this.recomputeMprSet();
    this.recomputeRoutingTable(
      `${this.routingPeer.name} refreshed OLSR routes after HELLO from ${sender.name}.`,
      message,
    );

    return true;
  }

  private processTc(message: OlsrTcMessage) {
    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    const sender = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.OLSR)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneOlsrMessage(message),
        reason: ui.runtime.nextHopNoOlsr,
      });
      return false;
    }

    const previousAnsn = this.lastTcSequenceByOriginator.get(message.sourcePeerId) ?? -1;
    if (message.ansn <= previousAnsn) {
      return true;
    }

    this.lastTcSequenceByOriginator.set(message.sourcePeerId, message.ansn);

    for (const key of [...this.topologyEntries.keys()]) {
      if (key.startsWith(`${message.sourcePeerId}:`)) {
        this.topologyEntries.delete(key);
      }
    }

    const tick = this.eventRecorder.getCurrentTick();
    for (const destinationPeerId of message.advertisedNeighbours) {
      const key = `${message.sourcePeerId}:${destinationPeerId}`;
      this.topologyEntries.set(key, {
        destinationPeerId,
        lastHopPeerId: message.sourcePeerId,
        sequenceNumber: message.ansn,
        lastUpdateTick: tick,
      });
    }

    this.recomputeRoutingTable(
      `${this.routingPeer.name} recalculated OLSR routes after TC from ${sender.name} (ANSN ${message.ansn}).`,
      message,
    );

    if (this.selectorPeerIds.size > 0 && message.timeToLive > 1) {
      const forwardedMessage: OlsrTcMessage = {
        ...message,
        senderPeerId: this.routingPeer.id,
        timeToLive: message.timeToLive - 1,
      };
      this.broadcastControlMessage(
        forwardedMessage,
        true,
        `TC message with ANSN ${message.ansn} was forwarded by selected relay.`,
        message.senderPeerId,
      );
    }

    return true;
  }

  private recomputeMprSet() {
    const symmetricNeighbours = this.getSymmetricNeighbours();
    this.mprPeerIds.clear();

    const directNeighbourIds = new Set(symmetricNeighbours.map((peer) => peer.id));
    const twoHopByNeighbour = new Map<UUID, Set<UUID>>();
    const uncoveredTwoHop = new Set<UUID>();

    for (const neighbour of symmetricNeighbours) {
      const twoHop = new Set<UUID>();
      for (const neighbourOfNeighbour of neighbour.getNeighbours()) {
        if (
          neighbourOfNeighbour.id !== this.routingPeer.id &&
          neighbourOfNeighbour.supports(RoutingProtocol.OLSR) &&
          !directNeighbourIds.has(neighbourOfNeighbour.id)
        ) {
          twoHop.add(neighbourOfNeighbour.id);
          uncoveredTwoHop.add(neighbourOfNeighbour.id);
        }
      }
      twoHopByNeighbour.set(neighbour.id, twoHop);
    }

    for (const twoHopId of [...uncoveredTwoHop]) {
      const candidates = symmetricNeighbours.filter((neighbour) =>
        twoHopByNeighbour.get(neighbour.id)?.has(twoHopId),
      );

      if (candidates.length === 1) {
        this.mprPeerIds.add(candidates[0].id);
      }
    }

    for (const selectedId of this.mprPeerIds) {
      const coverage = twoHopByNeighbour.get(selectedId);
      if (!coverage) {
        continue;
      }
      for (const twoHopId of coverage) {
        uncoveredTwoHop.delete(twoHopId);
      }
    }

    while (uncoveredTwoHop.size > 0) {
      let bestNeighbourId: UUID | null = null;
      let bestCoverage = 0;

      for (const neighbour of symmetricNeighbours) {
        if (this.mprPeerIds.has(neighbour.id)) {
          continue;
        }

        const coverage = [...(twoHopByNeighbour.get(neighbour.id) ?? [])].filter((twoHopId) =>
          uncoveredTwoHop.has(twoHopId),
        ).length;

        if (coverage > bestCoverage) {
          bestCoverage = coverage;
          bestNeighbourId = neighbour.id;
        }
      }

      if (!bestNeighbourId || bestCoverage === 0) {
        break;
      }

      this.mprPeerIds.add(bestNeighbourId);
      const coveredSet = twoHopByNeighbour.get(bestNeighbourId);
      if (coveredSet) {
        for (const twoHopId of coveredSet) {
          uncoveredTwoHop.delete(twoHopId);
        }
      }
    }

    const tick = this.eventRecorder.getCurrentTick();
    for (const neighbour of symmetricNeighbours) {
      this.neighbourTable.set(neighbour.id, {
        neighbourPeerId: neighbour.id,
        status: this.mprPeerIds.has(neighbour.id) ? "MPR" : "SYMMETRIC",
        lastUpdateTick: tick,
      });
    }
  }

  private recomputeRoutingTable(reason: string, message: SimulationMessage | null) {
    const nextRoutes = this.calculateRoutes();
    const previousRoutes = new Map(this.routingTable);

    for (const [destinationPeerId, previousRoute] of previousRoutes.entries()) {
      if (nextRoutes.has(destinationPeerId)) {
        continue;
      }

      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableRemove, {
        protocol: RoutingProtocol.OLSR,
        destinationPeerId,
        nextHopPeerId: previousRoute.nextHopPeerId,
        previousRoute,
        nextRoute: null,
        message: message ? cloneOlsrMessage(message) : undefined,
        reason,
      });
    }

    for (const [destinationPeerId, nextRoute] of nextRoutes.entries()) {
      const previousRoute = previousRoutes.get(destinationPeerId) ?? null;
      if (!previousRoute) {
        this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableInsert, {
          protocol: RoutingProtocol.OLSR,
          destinationPeerId,
          nextHopPeerId: nextRoute.nextHopPeerId,
          previousRoute: null,
          nextRoute,
          message: message ? cloneOlsrMessage(message) : undefined,
          reason,
        });
        continue;
      }

      if (
        previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
        previousRoute.metric !== nextRoute.metric ||
        previousRoute.sequenceNumber !== nextRoute.sequenceNumber
      ) {
        this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
          protocol: RoutingProtocol.OLSR,
          destinationPeerId,
          nextHopPeerId: nextRoute.nextHopPeerId,
          previousRoute,
          nextRoute,
          message: message ? cloneOlsrMessage(message) : undefined,
          reason,
        });
      }
    }

    this.routingTable.clear();
    for (const [destinationPeerId, route] of nextRoutes.entries()) {
      this.routingTable.set(destinationPeerId, route);
    }

    if (message) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemThroughputCalculated, {
        message: cloneOlsrMessage(message),
        reason,
      });
    }
  }

  private calculateRoutes() {
    const routes = new Map<UUID, OlsrRouteRecord>();
    const queue: UUID[] = [];
    const tick = this.eventRecorder.getCurrentTick();

    const directNeighbours = this.getSymmetricNeighbours();
    for (const neighbour of directNeighbours) {
      routes.set(neighbour.id, {
        destinationPeerId: neighbour.id,
        nextHopPeerId: neighbour.id,
        metric: 1,
        sequenceNumber: 0,
        lastUpdateTick: tick,
      });
      queue.push(neighbour.id);
    }

    while (queue.length > 0) {
      const pivotDestinationId = queue.shift();
      if (!pivotDestinationId) {
        continue;
      }

      const pivotRoute = routes.get(pivotDestinationId);
      if (!pivotRoute) {
        continue;
      }

      for (const entry of this.topologyEntries.values()) {
        if (entry.lastHopPeerId !== pivotDestinationId) {
          continue;
        }

        if (entry.destinationPeerId === this.routingPeer.id) {
          continue;
        }

        const candidateMetric = pivotRoute.metric + 1;
        const currentRoute = routes.get(entry.destinationPeerId);
        if (!currentRoute || candidateMetric < currentRoute.metric) {
          routes.set(entry.destinationPeerId, {
            destinationPeerId: entry.destinationPeerId,
            nextHopPeerId: pivotRoute.nextHopPeerId,
            metric: candidateMetric,
            sequenceNumber: entry.sequenceNumber,
            lastUpdateTick: tick,
          });
          queue.push(entry.destinationPeerId);
        }
      }
    }

    routes.delete(this.routingPeer.id);
    return routes;
  }

  private routeAndWrite(packet: SimulationPacket) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneOlsrMessage(packet),
        reason: ui.runtime.packetTtlReachedZero,
      });
      return false;
    }

    const selectedRoute = this.routingTable.get(packet.destinationPeerId) ?? null;
    if (!selectedRoute) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        reason: ui.runtime.noRouteForDestinationOlsr,
        reasonCode: "NO_ROUTE",
      });
      return false;
    }

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemRouteSelected, {
      protocol: RoutingProtocol.OLSR,
      destinationPeerId: packet.destinationPeerId,
      selectedRoute,
      message: cloneOlsrMessage(packet),
    });

    return this.write(packet, selectedRoute.nextHopPeerId);
  }

  private write(message: SimulationPacket | OlsrHelloMessage | OlsrTcMessage, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneOlsrMessage(message),
        reason: ui.runtime.nextHopNotNeighbour,
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.OLSR)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneOlsrMessage(message),
        reason: ui.runtime.nextHopNoOlsr,
      });
      return false;
    }

    const forwardedMessage =
      message.kind === SimulationMessageKind.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : cloneOlsrMessage(message);

    const targetModule = hop.getModule(RoutingProtocol.OLSR);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  private broadcastControlMessage(
    message: OlsrHelloMessage | OlsrTcMessage,
    retransmit: boolean,
    note: string,
    excludedPeerId?: UUID,
  ) {
    const neighbours = this.getSymmetricNeighbours().filter((peer) => peer.id !== excludedPeerId);

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
      neighbourPeerIds: neighbours.map((peer) => peer.id),
      retransmit,
      message: cloneOlsrMessage(message),
      note,
    });

    for (const neighbour of neighbours) {
      this.write(message, neighbour.id);
    }
  }

  private getSymmetricNeighbours() {
    return this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.OLSR) && peer.isActive());
  }
}
