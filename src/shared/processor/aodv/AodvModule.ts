import {
  AODV_ACTIVE_ROUTE_TIMEOUT,
  AODV_HELLO_LIFETIME_FACTOR,
  AODV_MIN_HELLO_INTERVAL,
  AODV_MIN_ROUTE_TIMEOUT,
  AODV_PATH_DISCOVERY_TTL,
  AODV_SEQUENCE_INITIAL,
} from "@/shared/constants/aodv";
import { getAodvConfiguration } from "@/shared/types/model/peers";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import {
  SimulationEventType,
  SimulationMessageKind,
  type AodvHelloMessage,
  type AodvRouteErrorMessage,
  type AodvRouteRecord,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
  type AodvUnreachableDestination,
  type SimulationPacket,
} from "@/shared/types/model/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import { SimulationEventRecorder } from "@/shared/processor/core/EventRecorder";
import type { PacketCapableModule, SimulationPeerNode } from "@/shared/processor/core/runtimeTypes";
import { cloneAodvMessage, isAodvSimulationMessage } from "./aodvMessage";

type AodvRouteEntry = AodvRouteRecord & {
  expiresAtTick: number;
};

type RouteReplyCandidate = {
  replierPeerId: UUID;
  pathPeerIds: UUID[];
  destinationSequenceNumber: number;
  replierDistanceToDestination: number;
  totalMetric: number;
  repliedFromIntermediate: boolean;
};

const clampHelloInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(AODV_MIN_HELLO_INTERVAL, normalized);
};

const clampRouteTimeout = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(AODV_MIN_ROUTE_TIMEOUT, normalized);
};

export class AodvModule implements PacketCapableModule {
  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private readonly routingTable = new Map<UUID, AodvRouteEntry>();

  private readonly lastHelloTickByNeighbour = new Map<UUID, number>();

  private ownSequenceNumber = AODV_SEQUENCE_INITIAL;

  private requestSequence = 0;

  constructor(routingPeer: SimulationPeerNode, eventRecorder: SimulationEventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;

    const currentTick = this.eventRecorder.getCurrentTick();
    this.routingTable.set(this.routingPeer.id, {
      destinationPeerId: this.routingPeer.id,
      nextHopPeerId: this.routingPeer.id,
      metric: 0,
      sequenceNumber: this.ownSequenceNumber,
      lastUpdateTick: currentTick,
      validSequenceNumber: true,
      valid: true,
      precursors: [],
      expiresAtTick: currentTick + this.getRouteTimeout(),
    });
  }

  read(message: unknown): boolean {
    if (!isAodvSimulationMessage(message)) {
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

    if (message.kind === SimulationMessageKind.AodvHelloMessage) {
      return this.processHelloMessage(message);
    }

    if (message.kind === SimulationMessageKind.AodvRouteErrorMessage) {
      return this.processRouteErrorMessage(message);
    }

    return true;
  }

  refresh() {
    this.refreshHello();
  }

  refreshHello() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    const neighbours = this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.AODV));

    const helloMessage: AodvHelloMessage = {
      kind: SimulationMessageKind.AodvHelloMessage,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      destinationSequenceNumber: this.ownSequenceNumber,
      lifetime: this.getHelloLifetime(),
      interval: this.getHelloInterval(),
    };

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
      neighbourPeerIds: neighbours.map((peer) => peer.id),
      retransmit: false,
      message: cloneAodvMessage(helloMessage),
      note: `AODV HELLO advertised local connectivity for ${helloMessage.lifetime} ticks.`,
    });

    for (const neighbour of neighbours) {
      this.writeControlMessage(helloMessage, neighbour.id);
    }
  }

  tick() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const brokenNextHops = new Set<UUID>();

    for (const [destinationPeerId, route] of this.routingTable.entries()) {
      if (destinationPeerId === this.routingPeer.id) {
        continue;
      }

      if (route.expiresAtTick <= currentTick) {
        this.removeRoute(destinationPeerId, null, `AODV route to ${destinationPeerId} expired.`);
        continue;
      }

      const nextHop = this.routingPeer.getNeighbour(route.nextHopPeerId);
      if (!nextHop || !nextHop.supports(RoutingProtocol.AODV)) {
        brokenNextHops.add(route.nextHopPeerId);
      }
    }

    for (const nextHopPeerId of brokenNextHops) {
      this.handleLinkBreak(
        nextHopPeerId,
        `AODV detected link break towards next hop ${nextHopPeerId}.`,
      );
    }
  }

  send(packet: SimulationPacket): boolean {
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(packet),
        reason: "Source peer is disabled",
      });
      return false;
    }

    const sourcePacket: SimulationPacket =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.routingPeer.id } : packet;

    if (sourcePacket.destinationPeerId === this.routingPeer.id) {
      return true;
    }

    return this.routeAndWrite(sourcePacket);
  }

  getRoutes() {
    return [...this.routingTable.values()]
      .filter((route) => route.destinationPeerId !== this.routingPeer.id)
      .sort((left, right) => left.destinationPeerId.localeCompare(right.destinationPeerId))
      .map((route) => ({
        destinationPeerId: route.destinationPeerId,
        nextHopPeerId: route.nextHopPeerId,
        metric: route.metric,
        sequenceNumber: route.sequenceNumber,
        lastUpdateTick: route.lastUpdateTick,
        validSequenceNumber: route.validSequenceNumber,
        valid: route.valid,
        precursors: [...route.precursors],
      }));
  }

  private routeAndWrite(packet: SimulationPacket): boolean {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(packet),
        reason: "Packet TTL reached zero",
      });
      return false;
    }

    let route = this.getUsableRoute(packet.destinationPeerId);
    if (!route) {
      route = this.discoverRoute(packet.destinationPeerId);
    }

    if (!route) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(packet),
        reason: "No AODV route is available for the destination",
        reasonCode: "NO_ROUTE",
      });
      return false;
    }

    this.touchRoute(packet.destinationPeerId);
    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemRouteSelected, {
      protocol: RoutingProtocol.AODV,
      destinationPeerId: packet.destinationPeerId,
      selectedRoute: {
        destinationPeerId: route.destinationPeerId,
        nextHopPeerId: route.nextHopPeerId,
        metric: route.metric,
        sequenceNumber: route.sequenceNumber,
        lastUpdateTick: route.lastUpdateTick,
        validSequenceNumber: route.validSequenceNumber,
        valid: route.valid,
        precursors: [...route.precursors],
      },
      message: cloneAodvMessage(packet),
    });

    return this.writePacket(packet, route.nextHopPeerId);
  }

  private discoverRoute(destinationPeerId: UUID): AodvRouteEntry | null {
    this.ownSequenceNumber += 1;
    this.requestSequence += 1;
    this.refreshSelfRoute();

    const requestId = this.requestSequence;
    const requestedSequenceNumber = this.getRequestedDestinationSequence(destinationPeerId);
    const queue: Array<{
      peer: SimulationPeerNode;
      previousHopPeerId: UUID | null;
      hopCount: number;
      pathPeerIds: UUID[];
    }> = [
      {
        peer: this.routingPeer,
        previousHopPeerId: null,
        hopCount: 0,
        pathPeerIds: [this.routingPeer.id],
      },
    ];
    const bestHopByPeer = new Map<UUID, number>([[this.routingPeer.id, 0]]);
    let bestReply: RouteReplyCandidate | null = null;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const currentModule = this.getAodvModule(current.peer);
      if (!currentModule) {
        continue;
      }

      const requestMessage: AodvRouteRequestMessage = {
        kind: SimulationMessageKind.AodvRouteRequestMessage,
        sourcePeerId: this.routingPeer.id,
        senderPeerId: current.peer.id,
        destinationPeerId,
        requestId,
        hopCount: current.hopCount,
        destinationSequenceNumber: requestedSequenceNumber,
        originatorSequenceNumber: this.ownSequenceNumber,
      };

      if (current.previousHopPeerId !== null) {
        currentModule.upsertRoute(
          this.routingPeer.id,
          current.previousHopPeerId,
          current.hopCount,
          this.ownSequenceNumber,
          true,
          `AODV RREQ ${requestId} updated reverse route to originator ${this.routingPeer.id}.`,
          requestMessage,
          AODV_ACTIVE_ROUTE_TIMEOUT,
        );
      }

      const neighbours = current.peer
        .getNeighbours()
        .filter((peer) => peer.supports(RoutingProtocol.AODV) && peer.isActive());

      this.eventRecorder.save(current.peer.id, SimulationEventType.SystemMessageBroadcast, {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit: current.peer.id !== this.routingPeer.id,
        message: cloneAodvMessage(requestMessage),
        note:
          current.peer.id === this.routingPeer.id
            ? `AODV Route Request ${requestId} flooded for destination ${destinationPeerId}.`
            : `Forwarded AODV Route Request ${requestId} with hop count ${current.hopCount}.`,
      });

      const candidate = currentModule.buildReplyCandidate(
        destinationPeerId,
        requestedSequenceNumber,
        current.pathPeerIds,
        current.hopCount,
      );
      if (candidate && this.isBetterReplyCandidate(candidate, bestReply)) {
        bestReply = candidate;
      }

      if (current.hopCount >= AODV_PATH_DISCOVERY_TTL) {
        continue;
      }

      for (const neighbour of neighbours) {
        const nextHopCount = current.hopCount + 1;
        const knownHopCount = bestHopByPeer.get(neighbour.id);
        if (knownHopCount !== undefined && knownHopCount <= nextHopCount) {
          continue;
        }

        bestHopByPeer.set(neighbour.id, nextHopCount);
        queue.push({
          peer: neighbour,
          previousHopPeerId: current.peer.id,
          hopCount: nextHopCount,
          pathPeerIds: [...current.pathPeerIds, neighbour.id],
        });
      }
    }

    if (!bestReply) {
      return null;
    }

    this.applyRouteReply(bestReply, requestId, destinationPeerId);
    return this.getUsableRoute(destinationPeerId);
  }

  private buildReplyCandidate(
    destinationPeerId: UUID,
    requestedSequenceNumber: number | null,
    pathPeerIds: UUID[],
    hopCountFromOrigin: number,
  ): RouteReplyCandidate | null {
    if (this.routingPeer.id === destinationPeerId) {
      if (requestedSequenceNumber === this.ownSequenceNumber) {
        this.ownSequenceNumber += 1;
        this.refreshSelfRoute();
      }

      return {
        replierPeerId: this.routingPeer.id,
        pathPeerIds: [...pathPeerIds],
        destinationSequenceNumber: this.ownSequenceNumber,
        replierDistanceToDestination: 0,
        totalMetric: hopCountFromOrigin,
        repliedFromIntermediate: false,
      };
    }

    const route = this.getUsableRoute(destinationPeerId);
    if (!route || route.destinationPeerId === this.routingPeer.id) {
      return null;
    }

    if (requestedSequenceNumber !== null && route.sequenceNumber < requestedSequenceNumber) {
      return null;
    }

    return {
      replierPeerId: this.routingPeer.id,
      pathPeerIds: [...pathPeerIds],
      destinationSequenceNumber: route.sequenceNumber,
      replierDistanceToDestination: route.metric,
      totalMetric: hopCountFromOrigin + route.metric,
      repliedFromIntermediate: true,
    };
  }

  private applyRouteReply(
    candidate: RouteReplyCandidate,
    requestId: number,
    destinationPeerId: UUID,
  ) {
    const peersAlongPath = this.getPeersAlongPath(candidate.pathPeerIds);
    if (peersAlongPath.length !== candidate.pathPeerIds.length) {
      return;
    }

    for (let index = peersAlongPath.length - 1; index > 0; index -= 1) {
      const senderPeer = peersAlongPath[index];
      const recipientPeer = peersAlongPath[index - 1];
      const senderModule = this.getAodvModule(senderPeer);
      const recipientModule = this.getAodvModule(recipientPeer);
      if (!senderModule || !recipientModule) {
        continue;
      }

      const senderDistanceToDestination =
        candidate.replierDistanceToDestination + (peersAlongPath.length - 1 - index);
      const replyMessage: AodvRouteReplyMessage = {
        kind: SimulationMessageKind.AodvRouteReplyMessage,
        sourcePeerId: this.routingPeer.id,
        senderPeerId: senderPeer.id,
        targetPeerId: recipientPeer.id,
        destinationPeerId,
        destinationSequenceNumber: candidate.destinationSequenceNumber,
        originatorPeerId: this.routingPeer.id,
        hopCount: senderDistanceToDestination,
        lifetime: this.getRouteTimeout(),
        gratuitous: candidate.repliedFromIntermediate,
      };

      this.eventRecorder.save(senderPeer.id, SimulationEventType.SystemThroughputCalculated, {
        message: cloneAodvMessage(replyMessage),
        reason: `AODV Route Reply ${requestId} unicast to ${recipientPeer.id} for destination ${destinationPeerId} with hop count ${senderDistanceToDestination}.`,
      });

      senderModule.addPrecursor(destinationPeerId, recipientPeer.id);
      recipientModule.upsertRoute(
        destinationPeerId,
        senderPeer.id,
        senderDistanceToDestination + 1,
        candidate.destinationSequenceNumber,
        true,
        `AODV Route Reply ${requestId} installed forward route to destination ${destinationPeerId}.`,
        replyMessage,
        replyMessage.lifetime,
      );
    }
  }

  private processHelloMessage(message: AodvHelloMessage) {
    const sender = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.AODV)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(message),
        reason: "Selected next hop does not support AODV",
      });
      return false;
    }

    this.lastHelloTickByNeighbour.set(message.senderPeerId, this.eventRecorder.getCurrentTick());
    this.upsertRoute(
      message.sourcePeerId,
      message.senderPeerId,
      1,
      message.destinationSequenceNumber,
      true,
      `AODV HELLO refreshed direct neighbour route to ${message.sourcePeerId}.`,
      message,
      message.lifetime,
    );

    return true;
  }

  private processRouteErrorMessage(message: AodvRouteErrorMessage) {
    const sender = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(RoutingProtocol.AODV)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(message),
        reason: "Selected next hop does not support AODV",
      });
      return false;
    }

    const recipients = new Set<UUID>();
    const propagatedDestinations: AodvUnreachableDestination[] = [];

    for (const unreachable of message.unreachableDestinations) {
      const route = this.routingTable.get(unreachable.destinationPeerId);
      if (!route || route.nextHopPeerId !== message.senderPeerId) {
        continue;
      }

      for (const precursorPeerId of route.precursors) {
        if (precursorPeerId !== message.senderPeerId) {
          recipients.add(precursorPeerId);
        }
      }

      propagatedDestinations.push({
        destinationPeerId: unreachable.destinationPeerId,
        sequenceNumber: Math.max(unreachable.sequenceNumber, route.sequenceNumber + 1),
      });

      this.removeRoute(
        unreachable.destinationPeerId,
        message,
        `AODV Route Error invalidated route to ${unreachable.destinationPeerId}.`,
      );
    }

    if (propagatedDestinations.length === 0) {
      return true;
    }

    this.propagateRouteError(
      propagatedDestinations,
      [...recipients],
      `Forwarded AODV Route Error for ${propagatedDestinations.map((entry) => entry.destinationPeerId).join(", ")}.`,
      message.sourcePeerId,
    );

    return true;
  }

  private writePacket(packet: SimulationPacket, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(packet),
        reason: "Selected next hop is not a current neighbour",
      });
      this.handleLinkBreak(
        hopPeerId,
        `AODV failed to forward packet because next hop ${hopPeerId} is unavailable.`,
      );
      return false;
    }

    if (!hop.supports(RoutingProtocol.AODV)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneAodvMessage(packet),
        reason: "Selected next hop does not support AODV",
      });
      this.handleLinkBreak(
        hopPeerId,
        `AODV failed to forward packet because next hop ${hopPeerId} does not support AODV.`,
      );
      return false;
    }

    const forwardedPacket =
      packet.sourcePeerId === null
        ? { ...packet, sourcePeerId: this.routingPeer.id }
        : cloneAodvMessage(packet);

    this.addPrecursor(packet.destinationPeerId, this.routingPeer.id);

    const targetModule = hop.getModule(RoutingProtocol.AODV);
    const delivered = targetModule?.read(forwardedPacket) ?? false;
    if (!delivered) {
      this.handleLinkBreak(
        hopPeerId,
        `AODV detected downstream forwarding failure via next hop ${hopPeerId}.`,
      );
    }

    return delivered;
  }

  private writeControlMessage(message: AodvHelloMessage | AodvRouteErrorMessage, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop || !hop.supports(RoutingProtocol.AODV)) {
      return false;
    }

    const targetModule = hop.getModule(RoutingProtocol.AODV);
    return targetModule?.read(cloneAodvMessage(message)) ?? false;
  }

  private handleLinkBreak(nextHopPeerId: UUID, reason: string) {
    const affectedRoutes = [...this.routingTable.values()].filter(
      (route) =>
        route.destinationPeerId !== this.routingPeer.id && route.nextHopPeerId === nextHopPeerId,
    );
    if (affectedRoutes.length === 0) {
      return;
    }

    const recipients = new Set<UUID>();
    const unreachableDestinations: AodvUnreachableDestination[] = [];

    for (const route of affectedRoutes) {
      for (const precursorPeerId of route.precursors) {
        recipients.add(precursorPeerId);
      }

      unreachableDestinations.push({
        destinationPeerId: route.destinationPeerId,
        sequenceNumber: route.sequenceNumber + 1,
      });

      this.removeRoute(
        route.destinationPeerId,
        null,
        `${reason} Route to ${route.destinationPeerId} was invalidated.`,
      );
    }

    this.propagateRouteError(unreachableDestinations, [...recipients], reason, this.routingPeer.id);
  }

  private propagateRouteError(
    unreachableDestinations: AodvUnreachableDestination[],
    recipientPeerIds: UUID[],
    reason: string,
    sourcePeerId: UUID,
  ) {
    if (unreachableDestinations.length === 0 || recipientPeerIds.length === 0) {
      return;
    }

    const errorMessage: AodvRouteErrorMessage = {
      kind: SimulationMessageKind.AodvRouteErrorMessage,
      sourcePeerId,
      senderPeerId: this.routingPeer.id,
      targetPeerId: recipientPeerIds.length === 1 ? recipientPeerIds[0] : null,
      unreachableDestinations: unreachableDestinations.map((entry) => ({ ...entry })),
      noDelete: false,
    };

    if (recipientPeerIds.length > 1) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
        neighbourPeerIds: recipientPeerIds,
        retransmit: true,
        message: cloneAodvMessage(errorMessage),
        note: reason,
      });
    } else {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemThroughputCalculated, {
        message: cloneAodvMessage(errorMessage),
        reason,
      });
    }

    for (const recipientPeerId of recipientPeerIds) {
      this.writeControlMessage(errorMessage, recipientPeerId);
    }
  }

  private upsertRoute(
    destinationPeerId: UUID,
    nextHopPeerId: UUID,
    metric: number,
    sequenceNumber: number,
    validSequenceNumber: boolean,
    reason: string,
    message: AodvHelloMessage | AodvRouteRequestMessage | AodvRouteReplyMessage,
    lifetime: number,
  ) {
    if (destinationPeerId === this.routingPeer.id) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const previousRoute = this.routingTable.get(destinationPeerId) ?? null;
    const nextRoute: AodvRouteEntry = {
      destinationPeerId,
      nextHopPeerId,
      metric,
      sequenceNumber,
      lastUpdateTick: currentTick,
      validSequenceNumber,
      valid: true,
      precursors: [...(previousRoute?.precursors ?? [])],
      expiresAtTick: currentTick + Math.max(1, lifetime),
    };

    if (!this.shouldAdoptRoute(previousRoute, nextRoute)) {
      if (previousRoute) {
        this.routingTable.set(destinationPeerId, {
          ...previousRoute,
          lastUpdateTick: currentTick,
          expiresAtTick: currentTick + Math.max(1, lifetime),
        });
      }
      return;
    }

    this.routingTable.set(destinationPeerId, nextRoute);

    if (!previousRoute) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableInsert, {
        protocol: RoutingProtocol.AODV,
        destinationPeerId,
        nextHopPeerId,
        previousRoute: null,
        nextRoute: this.toPublicRoute(nextRoute),
        message: cloneAodvMessage(message),
        reason,
      });
      return;
    }

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
      protocol: RoutingProtocol.AODV,
      destinationPeerId,
      nextHopPeerId,
      previousRoute: this.toPublicRoute(previousRoute),
      nextRoute: this.toPublicRoute(nextRoute),
      message: cloneAodvMessage(message),
      reason,
    });
  }

  private removeRoute(
    destinationPeerId: UUID,
    message: AodvRouteErrorMessage | null,
    reason: string,
  ) {
    const previousRoute = this.routingTable.get(destinationPeerId);
    if (!previousRoute || destinationPeerId === this.routingPeer.id) {
      return;
    }

    this.routingTable.delete(destinationPeerId);
    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableRemove, {
      protocol: RoutingProtocol.AODV,
      destinationPeerId,
      nextHopPeerId: previousRoute.nextHopPeerId,
      previousRoute: this.toPublicRoute(previousRoute),
      nextRoute: null,
      message: message ? cloneAodvMessage(message) : undefined,
      reason,
    });
  }

  private addPrecursor(destinationPeerId: UUID, precursorPeerId: UUID) {
    const route = this.routingTable.get(destinationPeerId);
    if (!route || route.precursors.includes(precursorPeerId)) {
      return;
    }

    this.routingTable.set(destinationPeerId, {
      ...route,
      precursors: [...route.precursors, precursorPeerId],
    });
  }

  private refreshSelfRoute() {
    const currentTick = this.eventRecorder.getCurrentTick();
    this.routingTable.set(this.routingPeer.id, {
      destinationPeerId: this.routingPeer.id,
      nextHopPeerId: this.routingPeer.id,
      metric: 0,
      sequenceNumber: this.ownSequenceNumber,
      lastUpdateTick: currentTick,
      validSequenceNumber: true,
      valid: true,
      precursors: [],
      expiresAtTick: currentTick + this.getRouteTimeout(),
    });
  }

  private shouldAdoptRoute(previousRoute: AodvRouteEntry | null, nextRoute: AodvRouteEntry) {
    if (!previousRoute) {
      return true;
    }

    if (!previousRoute.validSequenceNumber && nextRoute.validSequenceNumber) {
      return true;
    }

    if (nextRoute.sequenceNumber > previousRoute.sequenceNumber) {
      return true;
    }

    if (nextRoute.sequenceNumber === previousRoute.sequenceNumber) {
      if (!previousRoute.valid) {
        return true;
      }

      if (nextRoute.metric < previousRoute.metric) {
        return true;
      }

      return nextRoute.nextHopPeerId !== previousRoute.nextHopPeerId;
    }

    return false;
  }

  private isBetterReplyCandidate(
    candidate: RouteReplyCandidate,
    currentBest: RouteReplyCandidate | null,
  ) {
    if (!currentBest) {
      return true;
    }

    if (candidate.destinationSequenceNumber !== currentBest.destinationSequenceNumber) {
      return candidate.destinationSequenceNumber > currentBest.destinationSequenceNumber;
    }

    return candidate.totalMetric < currentBest.totalMetric;
  }

  private getRequestedDestinationSequence(destinationPeerId: UUID) {
    const route = this.routingTable.get(destinationPeerId);
    if (!route || !route.validSequenceNumber) {
      return null;
    }

    return route.sequenceNumber;
  }

  private getUsableRoute(destinationPeerId: UUID) {
    const route = this.routingTable.get(destinationPeerId) ?? null;
    if (!route || !route.valid || destinationPeerId === this.routingPeer.id) {
      return route?.destinationPeerId === this.routingPeer.id ? route : null;
    }

    const nextHop = this.routingPeer.getNeighbour(route.nextHopPeerId);
    if (!nextHop || !nextHop.supports(RoutingProtocol.AODV)) {
      return null;
    }

    return route;
  }

  private touchRoute(destinationPeerId: UUID) {
    const route = this.routingTable.get(destinationPeerId);
    if (!route) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    this.routingTable.set(destinationPeerId, {
      ...route,
      lastUpdateTick: currentTick,
      expiresAtTick: currentTick + this.getRouteTimeout(),
    });
  }

  private getPeersAlongPath(pathPeerIds: UUID[]) {
    const peers: SimulationPeerNode[] = [];
    let currentPeer: SimulationPeerNode | null = this.routingPeer;

    for (let index = 0; index < pathPeerIds.length; index += 1) {
      const expectedPeerId = pathPeerIds[index];
      if (!currentPeer || currentPeer.id !== expectedPeerId) {
        break;
      }

      peers.push(currentPeer);

      if (index >= pathPeerIds.length - 1) {
        continue;
      }

      currentPeer = currentPeer.getNeighbour(pathPeerIds[index + 1]);
    }

    return peers;
  }

  private getAodvModule(peer: SimulationPeerNode | null) {
    if (!peer) {
      return null;
    }

    const module = peer.getModule(RoutingProtocol.AODV);
    return module instanceof AodvModule ? module : null;
  }

  private toPublicRoute(route: AodvRouteEntry): AodvRouteRecord {
    return {
      destinationPeerId: route.destinationPeerId,
      nextHopPeerId: route.nextHopPeerId,
      metric: route.metric,
      sequenceNumber: route.sequenceNumber,
      lastUpdateTick: route.lastUpdateTick,
      validSequenceNumber: route.validSequenceNumber,
      valid: route.valid,
      precursors: [...route.precursors],
    };
  }

  private getHelloInterval() {
    const configuration = getAodvConfiguration(this.routingPeer.getPeerEntity());
    if (!configuration) {
      return AODV_MIN_HELLO_INTERVAL;
    }

    return clampHelloInterval(configuration.helloInterval);
  }

  private getRouteTimeout() {
    const configuration = getAodvConfiguration(this.routingPeer.getPeerEntity());
    if (!configuration) {
      return AODV_MIN_ROUTE_TIMEOUT;
    }

    return clampRouteTimeout(configuration.routeTimeout);
  }

  private getHelloLifetime() {
    return Math.max(this.getRouteTimeout(), this.getHelloInterval() * AODV_HELLO_LIFETIME_FACTOR);
  }
}
