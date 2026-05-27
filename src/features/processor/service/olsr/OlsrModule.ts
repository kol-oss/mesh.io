import { EventRecorder } from "@/features/processor/EventRecorder";
import type { NodeWrapper } from "@/features/processor/types/node";
import {
  type OlsrHelloMessage,
  type OlsrRouteRecord,
  type OlsrTcMessage,
} from "@/features/processor/types/protocols/olsr";
import { OLSR_DEFAULT_TC_TTL, OLSR_MIN_INTERVAL } from "@/shared/constants/protocols/olsr";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { OlsrConfiguration } from "@/shared/types/model/configurations";
import { clone } from "../../utils/clone";
import { BaseModule } from "../BaseModule";
import { MprSet } from "./structures/MprSet";
import { NeighbourTable } from "./structures/NeighbourTable";
import { RoutingTable } from "./structures/RoutingTable";
import { SelectorSet } from "./structures/SelectorSet";
import { TopologyTable } from "./structures/TopologyTable";
import { TwoHopTable } from "./structures/TwoHopTable";

type RouteComputationResult = {
  routes: Map<UUID, OlsrRouteRecord>;
  explanation: string;
};

const clampInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(OLSR_MIN_INTERVAL, normalized);
};

export class OlsrModule extends BaseModule {
  private readonly neighbourTable = new NeighbourTable();
  private readonly selectorSet = new SelectorSet();
  private readonly mprSet = new MprSet();
  private readonly twoHopTable = new TwoHopTable();
  private readonly topologyTable = new TopologyTable();
  private readonly routingTable = new RoutingTable();
  private readonly lastTcSequenceByOriginator = new Map<UUID, number>();

  private ansn = 0;

  constructor(node: NodeWrapper, eventRecorder: EventRecorder) {
    super(node, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(MessageType.OlsrHelloMessage, MessageType.OlsrTcMessage);
  }

  override process(message: Message): boolean {
    if (message.type === MessageType.OlsrHelloMessage) {
      return this.processHello(message);
    }

    if (message.type === MessageType.OlsrTcMessage) {
      return this.processTc(message);
    }

    return false;
  }

  override refresh() {
    super.refresh();
    this.refreshHello();
    this.refreshTc();
  }

  refreshHello() {
    super.refresh();
    if (!this.node.isActive()) {
      return;
    }

    this.recomputeMprSet();

    const configuration = this.node.getConfiguration() as OlsrConfiguration;
    const helloMessage: OlsrHelloMessage = {
      type: MessageType.OlsrHelloMessage,
      sourcePeerId: this.node.id,
      senderPeerId: this.node.id,
      interval: clampInterval(configuration.helloInterval),
      neighbours: this.getLocalBroadcastNeighbours().map((peer) => peer.id),
      mprPeerIds: this.mprSet.toArray(),
    };

    this.broadcastControlMessage(helloMessage, false);
    this.recomputeRoutingTable(
      "Recomputed OLSR routes after local HELLO neighbour sensing and MPR selection.",
      helloMessage,
    );
  }

  refreshTc() {
    super.refresh();
    if (!this.node.isActive()) {
      return;
    }

    if (this.selectorSet.size === 0) {
      const tcMessage: OlsrTcMessage = {
        type: MessageType.OlsrTcMessage,
        sourcePeerId: this.node.id,
        senderPeerId: this.node.id,
        ansn: this.ansn,
        timeToLive: OLSR_DEFAULT_TC_TTL,
        advertisedNeighbours: [],
      };

      this.eventRecorder.record(
        this.node.id,
        EventType.Broadcast,
        {
          neighbourPeerIds: [],
          retransmit: false,
          message: clone(tcMessage),
        },
        RoutingProtocol.OLSR,
      );
      return;
    }

    this.ansn += 1;
    const tcMessage: OlsrTcMessage = {
      type: MessageType.OlsrTcMessage,
      sourcePeerId: this.node.id,
      senderPeerId: this.node.id,
      ansn: this.ansn,
      timeToLive: OLSR_DEFAULT_TC_TTL,
      advertisedNeighbours: [...this.selectorSet.values()],
    };

    this.broadcastControlMessage(tcMessage, false);
  }

  override tick() {
    super.tick();
    if (!this.node.isActive()) {
      return;
    }

    const tick = this.eventRecorder.getCurrentTick();
    const configuration = this.node.getConfiguration() as OlsrConfiguration;
    const helloExpiry = clampInterval(configuration.helloInterval) * 3;
    const tcExpiry = clampInterval(configuration.tcInterval) * 3;

    let changed = false;

    for (const [peerId, neighbour] of this.neighbourTable.entries()) {
      if (tick - neighbour.lastUpdateTick > helloExpiry) {
        this.neighbourTable.delete(peerId);
        this.selectorSet.delete(peerId);
        this.mprSet.delete(peerId);
        this.twoHopTable.deleteByViaPeerId(peerId);

        changed = true;
      }
    }

    for (const [key, entry] of this.twoHopTable.entries()) {
      if (tick - entry.lastUpdateTick > helloExpiry) {
        this.twoHopTable.delete(key);
        changed = true;
      }
    }

    for (const [key, topology] of this.topologyTable.entries()) {
      if (tick - topology.lastUpdateTick > tcExpiry) {
        this.topologyTable.delete(key);
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

  override getRoute(destinationId: UUID): UUID | null {
    const selectedRoute = this.routingTable.get(destinationId);
    if (!selectedRoute) {
      return null;
    }

    this.recordEvent(
      EventType.GetRoute,
      {
        protocol: RoutingProtocol.OLSR,
        destinationPeerId: destinationId,
        selectedRoute,
      } as GetRouteEventDetails,
      RoutingProtocol.OLSR,
    );

    return selectedRoute.nextHopPeerId;
  }

  getNeighbourTable() {
    return this.neighbourTable.getAll();
  }

  getTopologyTable() {
    return this.topologyTable.getAll();
  }

  getTwoHopTable() {
    return this.twoHopTable.getAll();
  }

  getSelectorTable() {
    return this.selectorSet.getAll();
  }

  getRoutes() {
    return this.routingTable.getAll();
  }

  private processHello(message: OlsrHelloMessage) {
    if (message.sourcePeerId === this.node.id) {
      return true;
    }

    const sender = this.node.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.OLSR)) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.UnsupportedProtocol,
      });
      return false;
    }

    const tick = this.eventRecorder.getCurrentTick();
    this.neighbourTable.set({
      neighbourPeerId: message.senderPeerId,
      status: message.mprPeerIds.includes(this.node.id) ? "MPR" : "SYMMETRIC",
      lastUpdateTick: tick,
    });

    this.twoHopTable.deleteByViaPeerId(message.senderPeerId);

    for (const destinationPeerId of message.neighbours) {
      if (
        destinationPeerId === this.node.id ||
        destinationPeerId === message.senderPeerId ||
        this.neighbourTable.has(destinationPeerId)
      ) {
        continue;
      }

      this.twoHopTable.set({
        destinationPeerId,
        viaPeerId: message.senderPeerId,
        lastUpdateTick: tick,
      });
    }

    if (message.mprPeerIds.includes(this.node.id)) {
      this.selectorSet.add(message.senderPeerId, tick);
    } else {
      this.selectorSet.delete(message.senderPeerId);
    }

    this.recomputeMprSet();
    this.recomputeRoutingTable(
      `${this.node.name} refreshed OLSR routes after HELLO from ${sender.name}.`,
      message,
    );

    return true;
  }

  private processTc(message: OlsrTcMessage) {
    if (message.sourcePeerId === this.node.id) {
      return true;
    }

    const sender = this.node.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.OLSR)) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.UnsupportedProtocol,
      });
      return false;
    }

    const previousAnsn = this.lastTcSequenceByOriginator.get(message.sourcePeerId) ?? -1;
    if (message.ansn <= previousAnsn) {
      return true;
    }

    this.lastTcSequenceByOriginator.set(message.sourcePeerId, message.ansn);

    this.topologyTable.deleteByLastHopPeerId(message.sourcePeerId);

    const tick = this.eventRecorder.getCurrentTick();
    for (const destinationPeerId of message.advertisedNeighbours) {
      this.topologyTable.set({
        destinationPeerId,
        lastHopPeerId: message.sourcePeerId,
        sequenceNumber: message.ansn,
        lastUpdateTick: tick,
      });
    }

    this.recomputeRoutingTable(
      `${this.node.name} recalculated OLSR routes after TC from ${sender.name} (ANSN ${message.ansn}).`,
      message,
    );

    if (this.selectorSet.size > 0 && message.timeToLive > 1) {
      const forwardedMessage: OlsrTcMessage = {
        ...message,
        senderPeerId: this.node.id,
        timeToLive: message.timeToLive - 1,
      };
      this.broadcastControlMessage(forwardedMessage, true, message.senderPeerId);
    }

    return true;
  }

  private recomputeMprSet() {
    const symmetricNeighbours = this.getKnownSymmetricNeighbours();
    this.mprSet.clear();

    const directNeighbourIds = new Set(symmetricNeighbours.map((peer) => peer.id));
    const twoHopByNeighbour = new Map<UUID, Set<UUID>>();
    const uncoveredTwoHop = new Set<UUID>();

    for (const neighbour of symmetricNeighbours) {
      const twoHop = new Set<UUID>();
      for (const neighbourOfNeighbour of this.twoHopTable.values()) {
        if (
          neighbourOfNeighbour.viaPeerId === neighbour.id &&
          neighbourOfNeighbour.destinationPeerId !== this.node.id &&
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
        this.mprSet.add(candidates[0].id);
      }
    }

    for (const selectedId of this.mprSet.values()) {
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
        if (this.mprSet.has(neighbour.id)) {
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

      this.mprSet.add(bestNeighbourId);
      const coveredSet = twoHopByNeighbour.get(bestNeighbourId);
      if (coveredSet) {
        for (const twoHopId of coveredSet) {
          uncoveredTwoHop.delete(twoHopId);
        }
      }
    }

    const tick = this.eventRecorder.getCurrentTick();
    for (const neighbour of symmetricNeighbours) {
      this.neighbourTable.set({
        neighbourPeerId: neighbour.id,
        status: this.mprSet.has(neighbour.id) ? "MPR" : "SYMMETRIC",
        lastUpdateTick: tick,
      });
    }
  }

  private recomputeRoutingTable(trigger: string, message: Message | null) {
    const computation = this.calculateRoutes(trigger);
    const nextRoutes = computation.routes;
    const previousRoutes = new Map(this.routingTable.entries());

    for (const [destinationPeerId, previousRoute] of previousRoutes.entries()) {
      if (nextRoutes.has(destinationPeerId)) {
        continue;
      }

      this.eventRecorder.record(
        this.node.id,
        EventType.DeleteRoute,
        {
          protocol: RoutingProtocol.OLSR,
          destinationPeerId,
          nextHopPeerId: previousRoute.nextHopPeerId,
          previousRoute,
          nextRoute: null,
          message: message ? clone(message) : undefined,
        },
        RoutingProtocol.OLSR,
      );
    }

    for (const [destinationPeerId, nextRoute] of nextRoutes.entries()) {
      const previousRoute = previousRoutes.get(destinationPeerId) ?? null;
      if (!previousRoute) {
        this.eventRecorder.record(
          this.node.id,
          EventType.AddRoute,
          {
            protocol: RoutingProtocol.OLSR,
            destinationPeerId,
            nextHopPeerId: nextRoute.nextHopPeerId,
            previousRoute: null,
            nextRoute,
            message: message ? clone(message) : undefined,
          },
          RoutingProtocol.OLSR,
        );
        continue;
      }

      if (
        previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
        previousRoute.metric !== nextRoute.metric ||
        previousRoute.sequenceNumber !== nextRoute.sequenceNumber
      ) {
        this.eventRecorder.record(
          this.node.id,
          EventType.UpdateRoute,
          {
            protocol: RoutingProtocol.OLSR,
            destinationPeerId,
            nextHopPeerId: nextRoute.nextHopPeerId,
            previousRoute,
            nextRoute,
            message: message ? clone(message) : undefined,
          },
          RoutingProtocol.OLSR,
        );
      }
    }

    this.routingTable.replaceWith(nextRoutes);

    if (message) {
      this.eventRecorder.record(
        this.node.id,
        EventType.Calculation,
        {
          message: clone(message),
        },
        RoutingProtocol.OLSR,
      );
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
    for (const entry of this.twoHopTable.values()) {
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

      for (const entry of this.topologyTable.values()) {
        if (entry.lastHopPeerId !== pivotDestinationId) {
          continue;
        }

        if (entry.destinationPeerId === this.node.id) {
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

    routes.delete(this.node.id);

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

  private broadcastControlMessage(
    message: OlsrHelloMessage | OlsrTcMessage,
    retransmit: boolean,
    excludedPeerId?: UUID,
  ) {
    const neighbours = this.getLocalBroadcastNeighbours().filter(
      (peer) => peer.id !== excludedPeerId,
    );

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit,
        message: clone(message),
      },
      RoutingProtocol.OLSR,
    );

    for (const neighbour of neighbours) {
      super.write(message, neighbour.id);
    }
  }

  private getLocalBroadcastNeighbours() {
    return this.node
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.OLSR) && peer.isActive());
  }

  private getKnownSymmetricNeighbours() {
    const neighbours: NodeWrapper[] = [];

    for (const record of this.neighbourTable.values()) {
      const peer = this.node.getNeighbour(record.neighbourPeerId);
      if (peer?.supports(RoutingProtocol.OLSR) && peer.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  private getPeerDisplayName(peerId: UUID) {
    return this.node.getNeighbour(peerId)?.name ?? "Unknown";
  }
}
