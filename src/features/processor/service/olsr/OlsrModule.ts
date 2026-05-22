import { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type OlsrHelloMessage,
  type OlsrNeighbourRecord,
  type OlsrRouteRecord,
  type OlsrSelectorRecord,
  type OlsrTcMessage,
  type OlsrTopologyRecord,
  type OlsrTwoHopRecord,
} from "@/features/processor/types/olsr";
import type { PeerNode, RoutingModule } from "@/features/processor/types/runtime";
import { OLSR_DEFAULT_TC_TTL, OLSR_MIN_INTERVAL } from "@/shared/constants/olsr";
import { EventType } from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { OlsrConfiguration } from "@/shared/types/model/configurations";
import { getOlsrConfiguration } from "@/shared/types/model/peers";
import { cloneOlsrMessage, isOlsrSimulationMessage } from "./olsrMessage";

type OlsrTopologyEntry = {
  destinationPeerId: UUID;
  lastHopPeerId: UUID;
  sequenceNumber: number;
  lastUpdateTick: number;
};

type OlsrTwoHopEntry = {
  destinationPeerId: UUID;
  viaPeerId: UUID;
  lastUpdateTick: number;
};

type RouteComputationResult = {
  routes: Map<UUID, OlsrRouteRecord>;
  explanation: string;
};

const clampInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(OLSR_MIN_INTERVAL, normalized);
};

export class OlsrModule implements RoutingModule {
  private readonly routingPeer: PeerNode;

  private readonly eventRecorder: EventRecorder;

  private readonly neighbourTable = new Map<UUID, OlsrNeighbourRecord>();

  private readonly selectorPeerIds = new Set<UUID>();

  private readonly mprPeerIds = new Set<UUID>();

  private readonly selectorLastUpdateTick = new Map<UUID, number>();

  private readonly twoHopEntries = new Map<string, OlsrTwoHopEntry>();

  private readonly topologyEntries = new Map<string, OlsrTopologyEntry>();

  private readonly routingTable = new Map<UUID, OlsrRouteRecord>();

  private readonly lastTcSequenceByOriginator = new Map<UUID, number>();

  private ansn = 0;

  private getConfiguration(): OlsrConfiguration {
    const peer = this.routingPeer.getEntity();
    const configuration = getOlsrConfiguration(peer);
    if (!configuration) {
      throw new Error("OLSR module requires an OLSR peer entity.");
    }

    return configuration;
  }

  constructor(routingPeer: PeerNode, eventRecorder: EventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
  }

  read(message: unknown): boolean {
    if (!isOlsrSimulationMessage(message)) {
      return false;
    }

    if (message.type === MessageType.Packet) {
      if (message.destinationPeerId === this.routingPeer.id) {
        return true;
      }

      const forwardedPacket: Packet = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.routeAndWrite(forwardedPacket);
    }

    if (message.type === MessageType.OlsrHelloMessage) {
      return this.processHello(message);
    }

    if (message.type === MessageType.OlsrTcMessage) {
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
      type: MessageType.OlsrHelloMessage,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      interval: clampInterval(this.getConfiguration().helloInterval),
      neighbours: this.getLocalBroadcastNeighbours().map((peer) => peer.id),
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
      const tcMessage: OlsrTcMessage = {
        type: MessageType.OlsrTcMessage,
        sourcePeerId: this.routingPeer.id,
        senderPeerId: this.routingPeer.id,
        ansn: this.ansn,
        timeToLive: OLSR_DEFAULT_TC_TTL,
        advertisedNeighbours: [],
      };

      this.eventRecorder.record(this.routingPeer.id, EventType.Broadcast, {
        neighbourPeerIds: [],
        retransmit: false,
        message: cloneOlsrMessage(tcMessage),
        note: `${this.routingPeer.name} did not send a TC message because its MPR Selector Set is empty. Only nodes selected as Multipoint Relays advertise topology information in OLSR.`,
      });
      return;
    }

    this.ansn += 1;
    const tcMessage: OlsrTcMessage = {
      type: MessageType.OlsrTcMessage,
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
    const configuration = this.getConfiguration();
    const helloExpiry = clampInterval(configuration.helloInterval) * 3;
    const tcExpiry = clampInterval(configuration.tcInterval) * 3;

    let changed = false;

    for (const [peerId, neighbour] of this.neighbourTable.entries()) {
      if (tick - neighbour.lastUpdateTick > helloExpiry) {
        this.neighbourTable.delete(peerId);
        this.selectorPeerIds.delete(peerId);
        this.selectorLastUpdateTick.delete(peerId);
        this.mprPeerIds.delete(peerId);

        for (const key of [...this.twoHopEntries.keys()]) {
          if (key.endsWith(`:${peerId}`)) {
            this.twoHopEntries.delete(key);
          }
        }

        changed = true;
      }
    }

    for (const [key, entry] of this.twoHopEntries.entries()) {
      if (tick - entry.lastUpdateTick > helloExpiry) {
        this.twoHopEntries.delete(key);
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

  send(packet: Packet): boolean {
    const sourcePacket: Packet =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.routingPeer.id } : packet;

    if (!this.routingPeer.isActive()) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(sourcePacket),
        reason: "Source peer is disabled",
      });
      return false;
    }

    return this.routeAndWrite(sourcePacket);
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

  getTwoHopTable() {
    return [...this.twoHopEntries.values()]
      .map(
        (entry): OlsrTwoHopRecord => ({
          destinationPeerId: entry.destinationPeerId,
          viaPeerId: entry.viaPeerId,
          lastUpdateTick: entry.lastUpdateTick,
        }),
      )
      .sort((left, right) => {
        if (left.destinationPeerId !== right.destinationPeerId) {
          return left.destinationPeerId.localeCompare(right.destinationPeerId);
        }

        return left.viaPeerId.localeCompare(right.viaPeerId);
      });
  }

  getSelectorTable() {
    return [...this.selectorPeerIds]
      .map(
        (selectorPeerId): OlsrSelectorRecord => ({
          selectorPeerId,
          lastUpdateTick: this.selectorLastUpdateTick.get(selectorPeerId) ?? 0,
        }),
      )
      .sort((left, right) => left.selectorPeerId.localeCompare(right.selectorPeerId));
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
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(message),
        reason: "Selected next hop does not support OLSR",
      });
      return false;
    }

    const tick = this.eventRecorder.getCurrentTick();
    this.neighbourTable.set(message.senderPeerId, {
      neighbourPeerId: message.senderPeerId,
      status: message.mprPeerIds.includes(this.routingPeer.id) ? "MPR" : "SYMMETRIC",
      lastUpdateTick: tick,
    });

    for (const key of [...this.twoHopEntries.keys()]) {
      if (key.endsWith(`:${message.senderPeerId}`)) {
        this.twoHopEntries.delete(key);
      }
    }

    for (const destinationPeerId of message.neighbours) {
      if (
        destinationPeerId === this.routingPeer.id ||
        destinationPeerId === message.senderPeerId ||
        this.neighbourTable.has(destinationPeerId)
      ) {
        continue;
      }

      this.twoHopEntries.set(`${destinationPeerId}:${message.senderPeerId}`, {
        destinationPeerId,
        viaPeerId: message.senderPeerId,
        lastUpdateTick: tick,
      });
    }

    if (message.mprPeerIds.includes(this.routingPeer.id)) {
      this.selectorPeerIds.add(message.senderPeerId);
      this.selectorLastUpdateTick.set(message.senderPeerId, tick);
    } else {
      this.selectorPeerIds.delete(message.senderPeerId);
      this.selectorLastUpdateTick.delete(message.senderPeerId);
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
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(message),
        reason: "Selected next hop does not support OLSR",
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
    const symmetricNeighbours = this.getKnownSymmetricNeighbours();
    this.mprPeerIds.clear();

    const directNeighbourIds = new Set(symmetricNeighbours.map((peer) => peer.id));
    const twoHopByNeighbour = new Map<UUID, Set<UUID>>();
    const uncoveredTwoHop = new Set<UUID>();

    for (const neighbour of symmetricNeighbours) {
      const twoHop = new Set<UUID>();
      for (const neighbourOfNeighbour of this.twoHopEntries.values()) {
        if (
          neighbourOfNeighbour.viaPeerId === neighbour.id &&
          neighbourOfNeighbour.destinationPeerId !== this.routingPeer.id &&
          !directNeighbourIds.has(neighbourOfNeighbour.destinationPeerId)
        ) {
          twoHop.add(neighbourOfNeighbour.destinationPeerId);
          uncoveredTwoHop.add(neighbourOfNeighbour.destinationPeerId);
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

  private recomputeRoutingTable(reason: string, message: Message | null) {
    const computation = this.calculateRoutes(reason);
    const nextRoutes = computation.routes;
    const previousRoutes = new Map(this.routingTable);

    for (const [destinationPeerId, previousRoute] of previousRoutes.entries()) {
      if (nextRoutes.has(destinationPeerId)) {
        continue;
      }

      this.eventRecorder.record(this.routingPeer.id, EventType.DeleteRoute, {
        protocol: RoutingProtocol.OLSR,
        destinationPeerId,
        nextHopPeerId: previousRoute.nextHopPeerId,
        previousRoute,
        nextRoute: null,
        message: message ? cloneOlsrMessage(message) : undefined,
        reason: `${computation.explanation} Removed route to ${this.getPeerDisplayName(destinationPeerId)} because it is no longer reachable in the recalculated topology.`,
      });
    }

    for (const [destinationPeerId, nextRoute] of nextRoutes.entries()) {
      const previousRoute = previousRoutes.get(destinationPeerId) ?? null;
      if (!previousRoute) {
        this.eventRecorder.record(this.routingPeer.id, EventType.AddRoute, {
          protocol: RoutingProtocol.OLSR,
          destinationPeerId,
          nextHopPeerId: nextRoute.nextHopPeerId,
          previousRoute: null,
          nextRoute,
          message: message ? cloneOlsrMessage(message) : undefined,
          reason: `${computation.explanation} Inserted route to ${this.getPeerDisplayName(destinationPeerId)} via ${this.getPeerDisplayName(nextRoute.nextHopPeerId)} with hop count ${nextRoute.metric}.`,
        });
        continue;
      }

      if (
        previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
        previousRoute.metric !== nextRoute.metric ||
        previousRoute.sequenceNumber !== nextRoute.sequenceNumber
      ) {
        this.eventRecorder.record(this.routingPeer.id, EventType.UpdateRoute, {
          protocol: RoutingProtocol.OLSR,
          destinationPeerId,
          nextHopPeerId: nextRoute.nextHopPeerId,
          previousRoute,
          nextRoute,
          message: message ? cloneOlsrMessage(message) : undefined,
          reason: `${computation.explanation} Updated route to ${this.getPeerDisplayName(destinationPeerId)} via ${this.getPeerDisplayName(nextRoute.nextHopPeerId)} with hop count ${nextRoute.metric}.`,
        });
      }
    }

    this.routingTable.clear();
    for (const [destinationPeerId, route] of nextRoutes.entries()) {
      this.routingTable.set(destinationPeerId, route);
    }

    if (message) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Calculation, {
        message: cloneOlsrMessage(message),
        reason: computation.explanation,
      });
    }
  }

  private calculateRoutes(trigger: string): RouteComputationResult {
    const routes = new Map<UUID, OlsrRouteRecord>();
    const queue: UUID[] = [];
    const tick = this.eventRecorder.getCurrentTick();
    const steps: string[] = [];

    const directNeighbours = this.getKnownSymmetricNeighbours();
    if (directNeighbours.length === 0) {
      steps.push("Neighbor Set contributed no symmetric 1-hop neighbours.");
    }

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

    if (directNeighbours.length > 0) {
      steps.push(
        `Neighbor Set seeded 1-hop routes: ${directNeighbours
          .map(
            (peer) =>
              `${this.getPeerDisplayName(peer.id)} via ${this.getPeerDisplayName(peer.id)} (1 hop)`,
          )
          .join(", ")}.`,
      );
    }

    const twoHopSeedDescriptions: string[] = [];
    for (const entry of this.twoHopEntries.values()) {
      if (routes.has(entry.destinationPeerId) || !this.neighbourTable.has(entry.viaPeerId)) {
        continue;
      }

      routes.set(entry.destinationPeerId, {
        destinationPeerId: entry.destinationPeerId,
        nextHopPeerId: entry.viaPeerId,
        metric: 2,
        sequenceNumber: 0,
        lastUpdateTick: tick,
      });
      queue.push(entry.destinationPeerId);
      twoHopSeedDescriptions.push(
        `${this.getPeerDisplayName(entry.destinationPeerId)} via ${this.getPeerDisplayName(entry.viaPeerId)} (2 hops)`,
      );
    }

    if (twoHopSeedDescriptions.length > 0) {
      steps.push(`2-Hop Neighbor Set seeded routes: ${twoHopSeedDescriptions.join(", ")}.`);
    } else {
      steps.push("2-Hop Neighbor Set contributed no new routes.");
    }

    const topologyExpansionDescriptions: string[] = [];

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
          topologyExpansionDescriptions.push(
            `${this.getPeerDisplayName(entry.destinationPeerId)} via ${this.getPeerDisplayName(pivotRoute.nextHopPeerId)} (${candidateMetric} hops, announced by ${this.getPeerDisplayName(entry.lastHopPeerId)})`,
          );
        }
      }
    }

    routes.delete(this.routingPeer.id);

    if (topologyExpansionDescriptions.length > 0) {
      steps.push(`Topology Table expanded routes: ${topologyExpansionDescriptions.join(", ")}.`);
    } else {
      steps.push("Topology Table added no routes beyond the 1-hop and 2-hop sets.");
    }

    const finalRoutes = [...routes.values()].map(
      (route) =>
        `${this.getPeerDisplayName(route.destinationPeerId)} via ${this.getPeerDisplayName(route.nextHopPeerId)} (${route.metric} hops)`,
    );

    steps.push(
      finalRoutes.length > 0
        ? `Final OLSR Routing Table: ${finalRoutes.join(", ")}.`
        : "Final OLSR Routing Table is empty.",
    );

    return {
      routes,
      explanation: `Trigger: ${trigger} Recalculation steps: ${steps.join(" ")}`,
    };
  }

  private routeAndWrite(packet: Packet) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(packet),
        reason: "Packet TTL reached zero",
      });
      return false;
    }

    const selectedRoute = this.routingTable.get(packet.destinationPeerId) ?? null;
    if (!selectedRoute) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(packet),
        reason: "No OLSR route is available for the destination",
        reasonCode: "NO_ROUTE",
      });
      return false;
    }

    this.eventRecorder.record(this.routingPeer.id, EventType.GetRoute, {
      protocol: RoutingProtocol.OLSR,
      destinationPeerId: packet.destinationPeerId,
      selectedRoute,
      message: cloneOlsrMessage(packet),
    });

    return this.write(packet, selectedRoute.nextHopPeerId);
  }

  private write(message: Packet | OlsrHelloMessage | OlsrTcMessage, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(message),
        reason: "Selected next hop is not a current neighbour",
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.OLSR)) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneOlsrMessage(message),
        reason: "Selected next hop does not support OLSR",
      });
      return false;
    }

    const forwardedMessage =
      message.type === MessageType.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : cloneOlsrMessage(message);

    if (forwardedMessage.type === MessageType.Packet) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Transfer, {
        protocol: RoutingProtocol.OLSR,
        sourcePeerId: this.routingPeer.id,
        targetPeerId: hopPeerId,
        message: cloneOlsrMessage(forwardedMessage),
      });
    }

    const targetModule = hop.getModule(RoutingProtocol.OLSR);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  private broadcastControlMessage(
    message: OlsrHelloMessage | OlsrTcMessage,
    retransmit: boolean,
    note: string,
    excludedPeerId?: UUID,
  ) {
    const neighbours = this.getLocalBroadcastNeighbours().filter(
      (peer) => peer.id !== excludedPeerId,
    );

    this.eventRecorder.record(this.routingPeer.id, EventType.Broadcast, {
      neighbourPeerIds: neighbours.map((peer) => peer.id),
      retransmit,
      message: cloneOlsrMessage(message),
      note,
    });

    for (const neighbour of neighbours) {
      this.write(message, neighbour.id);
    }
  }

  private getLocalBroadcastNeighbours() {
    return this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.OLSR) && peer.isActive());
  }

  private getKnownSymmetricNeighbours() {
    const neighbours: PeerNode[] = [];

    for (const record of this.neighbourTable.values()) {
      const peer = this.routingPeer.getNeighbour(record.neighbourPeerId);
      if (peer?.supports(RoutingProtocol.OLSR) && peer.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  private getPeerDisplayName(peerId: UUID) {
    return this.routingPeer.getNeighbour(peerId)?.name ?? "Unknown";
  }
}
