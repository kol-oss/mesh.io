import { EventRecorder } from "@/features/processor/EventRecorder";
import type { NodeWrapper } from "@/features/processor/types/node";
import {
  cloneAodvMessage,
  type AodvControlMessage,
  type AodvHelloMessage,
  type AodvRouteErrorMessage,
  type AodvRouteRecord,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
  type AodvUnreachableDestination,
} from "@/features/processor/types/protocols/aodv";
import {
  AODV_ACTIVE_ROUTE_TIMEOUT,
  AODV_HELLO_LIFETIME_FACTOR,
  AODV_MIN_HELLO_INTERVAL,
  AODV_MIN_ROUTE_TIMEOUT,
  AODV_PATH_DISCOVERY_TTL,
  AODV_SEQUENCE_INITIAL,
} from "@/shared/constants/protocols/aodv";
import {
  DropReason,
  EventType,
  type EventDetails,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import { getAodvConfiguration } from "@/shared/types/model/peers";
import { BaseModule } from "../BaseModule";
import { RoutingTable, type AodvRouteEntry } from "./structures/RoutingTable";

type RouteReplyCandidate = {
  replierPeerId: UUID;
  pathPeerIds: UUID[];
  destinationSequenceNumber: number;
  replierDistanceToDestination: number;
  totalMetric: number;
  repliedFromIntermediate: boolean;
};

const PROTOCOL = RoutingProtocol.AODV;

const clampHelloInterval = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(AODV_MIN_HELLO_INTERVAL, normalized);
};

const clampRouteTimeout = (value: number) => {
  const normalized = Math.floor(value);
  return Math.max(AODV_MIN_ROUTE_TIMEOUT, normalized);
};

export class AodvModule extends BaseModule {
  // routing structures
  private readonly routingTable = new RoutingTable();

  // sequence numbers
  private ownSequenceNumber = AODV_SEQUENCE_INITIAL;
  private requestSequence = 0;

  constructor(peer: NodeWrapper, eventRecorder: EventRecorder) {
    super(peer, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(
      MessageType.AodvHelloMessage,
      MessageType.AodvRouteErrorMessage,
    );

    this.initializeSelfRoute();
  }

  override read(message: Message): boolean {
    if (!this.peer.isActive()) {
      return false;
    }

    if (message.type === MessageType.Packet) {
      if (message.destinationPeerId === this.peer.id) {
        return true;
      }

      const forwardedPacket: Packet = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.processPacketWithDiscovery(forwardedPacket);
    }

    if (message.type === MessageType.AodvHelloMessage) {
      return this.processHello(message);
    }

    if (message.type === MessageType.AodvRouteErrorMessage) {
      return this.processRouteError(message);
    }

    return (
      message.type === MessageType.AodvRouteRequestMessage ||
      message.type === MessageType.AodvRouteReplyMessage
    );
  }

  override refresh() {
    super.refresh();
    this.refreshHello();
  }

  refreshHello() {
    super.refresh();
    if (!this.peer.isActive()) {
      return;
    }

    const neighbours = this.peer
      .getNeighbours()
      .filter((neighbour) => neighbour.supports(PROTOCOL));

    const helloMessage: AodvHelloMessage = {
      type: MessageType.AodvHelloMessage,
      sourcePeerId: this.peer.id,
      senderPeerId: this.peer.id,
      destinationSequenceNumber: this.ownSequenceNumber,
      lifetime: this.getHelloLifetime(),
      interval: this.getHelloInterval(),
    };

    this.recordAodvEvent(this.peer.id, EventType.Broadcast, {
      neighbourPeerIds: neighbours.map((neighbour) => neighbour.id),
      retransmit: false,
      message: cloneAodvMessage(helloMessage),
      note: `AODV HELLO advertised local connectivity for ${helloMessage.lifetime} ticks.`,
    });

    for (const neighbour of neighbours) {
      this.writeControlMessage(helloMessage, neighbour.id);
    }
  }

  override tick() {
    super.tick();
    if (!this.peer.isActive()) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const brokenNextHops = new Set<UUID>();

    for (const [destinationPeerId, route] of this.routingTable.entries()) {
      if (destinationPeerId === this.peer.id) {
        continue;
      }

      if (route.expiresAtTick <= currentTick) {
        this.removeRoute(destinationPeerId, null, `AODV route to ${destinationPeerId} expired.`);
        continue;
      }

      const nextHop = this.peer.getNeighbour(route.nextHopPeerId);
      if (!nextHop || !nextHop.supports(PROTOCOL)) {
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

  override send(packet: Packet): boolean {
    if (!this.peer.isActive()) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(packet),
          reason: DropReason.DestinationUnavailable,
        },
        PROTOCOL,
      );
      return false;
    }

    const sourcePacket: Packet =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.peer.id } : packet;

    if (sourcePacket.destinationPeerId === this.peer.id) {
      return true;
    }

    return this.processPacketWithDiscovery(sourcePacket);
  }

  override getRoute(destinationPeerId: UUID): UUID | null {
    return this.getUsableRoute(destinationPeerId)?.nextHopPeerId ?? null;
  }

  getRoutes() {
    return this.routingTable.getRoutes(this.peer.id);
  }

  private processPacketWithDiscovery(packet: Packet): boolean {
    if (packet.timeToLive <= 0) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(packet),
          reason: DropReason.TimeToLiveExceeded,
        },
        PROTOCOL,
      );
      return false;
    }

    let route = this.getUsableRoute(packet.destinationPeerId);
    if (!route) {
      route = this.discoverRoute(packet.destinationPeerId);
    }

    if (!route) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(packet),
          reason: DropReason.NoRoute,
        },
        PROTOCOL,
      );
      return false;
    }

    this.touchRoute(packet.destinationPeerId);
    this.recordEvent(
      EventType.GetRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId: packet.destinationPeerId,
        selectedRoute: this.toPublicRoute(route),
        message: cloneAodvMessage(packet),
      } as GetRouteEventDetails,
      PROTOCOL,
    );

    return this.writePacket(packet, route.nextHopPeerId);
  }

  private discoverRoute(destinationPeerId: UUID): AodvRouteEntry | null {
    this.ownSequenceNumber += 1;
    this.requestSequence += 1;
    this.initializeSelfRoute();

    const requestId = this.requestSequence;
    const requestedSequenceNumber = this.getRequestedDestinationSequence(destinationPeerId);
    const queue: Array<{
      peer: NodeWrapper;
      previousHopPeerId: UUID | null;
      hopCount: number;
      pathPeerIds: UUID[];
    }> = [
      {
        peer: this.peer,
        previousHopPeerId: null,
        hopCount: 0,
        pathPeerIds: [this.peer.id],
      },
    ];
    const bestHopByPeer = new Map<UUID, number>([[this.peer.id, 0]]);
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
        type: MessageType.AodvRouteRequestMessage,
        sourcePeerId: this.peer.id,
        senderPeerId: current.peer.id,
        destinationPeerId,
        requestId,
        hopCount: current.hopCount,
        destinationSequenceNumber: requestedSequenceNumber,
        originatorSequenceNumber: this.ownSequenceNumber,
      };

      if (current.previousHopPeerId !== null) {
        currentModule.upsertRoute(
          this.peer.id,
          current.previousHopPeerId,
          current.hopCount,
          this.ownSequenceNumber,
          true,
          `AODV RREQ ${requestId} updated reverse route to originator ${this.peer.id}.`,
          requestMessage,
          AODV_ACTIVE_ROUTE_TIMEOUT,
        );
      }

      const neighbours = current.peer
        .getNeighbours()
        .filter((neighbour) => neighbour.supports(PROTOCOL) && neighbour.isActive());

      this.recordAodvEvent(current.peer.id, EventType.Broadcast, {
        neighbourPeerIds: neighbours.map((neighbour) => neighbour.id),
        retransmit: current.peer.id !== this.peer.id,
        message: cloneAodvMessage(requestMessage),
        note:
          current.peer.id === this.peer.id
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
    if (this.peer.id === destinationPeerId) {
      if (requestedSequenceNumber === this.ownSequenceNumber) {
        this.ownSequenceNumber += 1;
        this.initializeSelfRoute();
      }

      return {
        replierPeerId: this.peer.id,
        pathPeerIds: [...pathPeerIds],
        destinationSequenceNumber: this.ownSequenceNumber,
        replierDistanceToDestination: 0,
        totalMetric: hopCountFromOrigin,
        repliedFromIntermediate: false,
      };
    }

    const route = this.getUsableRoute(destinationPeerId);
    if (!route || route.destinationPeerId === this.peer.id) {
      return null;
    }

    if (requestedSequenceNumber !== null && route.sequenceNumber < requestedSequenceNumber) {
      return null;
    }

    return {
      replierPeerId: this.peer.id,
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
        type: MessageType.AodvRouteReplyMessage,
        sourcePeerId: this.peer.id,
        senderPeerId: senderPeer.id,
        targetPeerId: recipientPeer.id,
        destinationPeerId,
        destinationSequenceNumber: candidate.destinationSequenceNumber,
        originatorPeerId: this.peer.id,
        hopCount: senderDistanceToDestination,
        lifetime: this.getRouteTimeout(),
        gratuitous: candidate.repliedFromIntermediate,
      };

      this.recordAodvEvent(senderPeer.id, EventType.Calculation, {
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

  private processHello(message: AodvHelloMessage): boolean {
    const sender = this.peer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(PROTOCOL)) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(message),
          reason: DropReason.UnsupportedProtocol,
        },
        PROTOCOL,
      );
      return false;
    }

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

  private processRouteError(message: AodvRouteErrorMessage): boolean {
    const sender = this.peer.getNeighbour(message.senderPeerId);
    if (!sender || !sender.supports(PROTOCOL)) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(message),
          reason: DropReason.UnsupportedProtocol,
        },
        PROTOCOL,
      );
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

  private writePacket(packet: Packet, hopPeerId: UUID): boolean {
    const hop = this.peer.getNeighbour(hopPeerId);
    if (!hop) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(packet),
          reason: DropReason.DestinationUnavailable,
        },
        PROTOCOL,
      );
      this.handleLinkBreak(
        hopPeerId,
        `AODV failed to forward packet because next hop ${hopPeerId} is unavailable.`,
      );
      return false;
    }

    if (!hop.supports(PROTOCOL)) {
      this.recordEvent(
        EventType.Drop,
        {
          message: cloneAodvMessage(packet),
          reason: DropReason.UnsupportedProtocol,
        },
        PROTOCOL,
      );
      this.handleLinkBreak(
        hopPeerId,
        `AODV failed to forward packet because next hop ${hopPeerId} does not support AODV.`,
      );
      return false;
    }

    const forwardedPacket =
      packet.sourcePeerId === null
        ? { ...packet, sourcePeerId: this.peer.id }
        : cloneAodvMessage(packet);

    this.recordEvent(
      EventType.Transfer,
      {
        protocol: PROTOCOL,
        sourcePeerId: this.peer.id,
        targetPeerId: hopPeerId,
        message: cloneAodvMessage(forwardedPacket),
      },
      PROTOCOL,
    );

    this.addPrecursor(packet.destinationPeerId, this.peer.id);

    const targetModule = hop.getModule(PROTOCOL);
    const delivered = targetModule?.read(forwardedPacket) ?? false;
    if (!delivered) {
      this.handleLinkBreak(
        hopPeerId,
        `AODV detected downstream forwarding failure via next hop ${hopPeerId}.`,
      );
    }

    return delivered;
  }

  private writeControlMessage(message: AodvControlMessage, hopPeerId: UUID): boolean {
    const hop = this.peer.getNeighbour(hopPeerId);
    if (!hop || !hop.supports(PROTOCOL)) {
      return false;
    }

    const targetModule = hop.getModule(PROTOCOL);
    return targetModule?.read(cloneAodvMessage(message)) ?? false;
  }

  private handleLinkBreak(nextHopPeerId: UUID, reason: string) {
    const affectedRoutes = [...this.routingTable.values()].filter(
      (route) => route.destinationPeerId !== this.peer.id && route.nextHopPeerId === nextHopPeerId,
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

    this.propagateRouteError(unreachableDestinations, [...recipients], reason, this.peer.id);
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
      type: MessageType.AodvRouteErrorMessage,
      sourcePeerId,
      senderPeerId: this.peer.id,
      targetPeerId: recipientPeerIds.length === 1 ? recipientPeerIds[0] : null,
      unreachableDestinations: unreachableDestinations.map((entry) => ({ ...entry })),
      noDelete: false,
    };

    if (recipientPeerIds.length > 1) {
      this.recordAodvEvent(this.peer.id, EventType.Broadcast, {
        neighbourPeerIds: recipientPeerIds,
        retransmit: true,
        message: cloneAodvMessage(errorMessage),
        note: reason,
      });
    } else {
      this.recordEvent(
        EventType.Calculation,
        {
          message: cloneAodvMessage(errorMessage),
          reason,
        },
        PROTOCOL,
      );
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
    message: AodvControlMessage,
    lifetime: number,
  ) {
    if (destinationPeerId === this.peer.id) {
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
      this.recordEvent(
        EventType.AddRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId,
          nextHopPeerId,
          previousRoute: null,
          nextRoute: this.toPublicRoute(nextRoute),
          message: cloneAodvMessage(message),
          reason,
        },
        PROTOCOL,
      );
      return;
    }

    this.recordEvent(
      EventType.UpdateRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId,
        nextHopPeerId,
        previousRoute: this.toPublicRoute(previousRoute),
        nextRoute: this.toPublicRoute(nextRoute),
        message: cloneAodvMessage(message),
        reason,
      },
      PROTOCOL,
    );
  }

  private removeRoute(
    destinationPeerId: UUID,
    message: AodvRouteErrorMessage | null,
    reason: string,
  ) {
    const previousRoute = this.routingTable.get(destinationPeerId);
    if (!previousRoute || destinationPeerId === this.peer.id) {
      return;
    }

    this.routingTable.delete(destinationPeerId);
    this.recordEvent(
      EventType.DeleteRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId,
        nextHopPeerId: previousRoute.nextHopPeerId,
        previousRoute: this.toPublicRoute(previousRoute),
        nextRoute: null,
        message: message ? cloneAodvMessage(message) : undefined,
        reason,
      },
      PROTOCOL,
    );
  }

  private addPrecursor(destinationPeerId: UUID, precursorPeerId: UUID) {
    this.routingTable.addPrecursor(destinationPeerId, precursorPeerId);
  }

  private initializeSelfRoute() {
    const currentTick = this.eventRecorder.getCurrentTick();
    this.routingTable.set(this.peer.id, {
      destinationPeerId: this.peer.id,
      nextHopPeerId: this.peer.id,
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
    if (!route || !route.valid || destinationPeerId === this.peer.id) {
      return route?.destinationPeerId === this.peer.id ? route : null;
    }

    const nextHop = this.peer.getNeighbour(route.nextHopPeerId);
    if (!nextHop || !nextHop.supports(PROTOCOL)) {
      return null;
    }

    return route;
  }

  private touchRoute(destinationPeerId: UUID) {
    this.routingTable.touch(
      destinationPeerId,
      this.eventRecorder.getCurrentTick(),
      this.getRouteTimeout(),
    );
  }

  private recordAodvEvent(peerId: UUID, type: EventType, details: EventDetails) {
    this.eventRecorder.record(peerId, type, details, PROTOCOL);
  }

  private getPeersAlongPath(pathPeerIds: UUID[]) {
    const peers: NodeWrapper[] = [];
    let currentPeer: NodeWrapper | null = this.peer;

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

  private getAodvModule(peer: NodeWrapper | null) {
    if (!peer) {
      return null;
    }

    const module = peer.getModule(PROTOCOL);
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
    const configuration = getAodvConfiguration(this.peer.getEntity());
    if (!configuration) {
      return AODV_MIN_HELLO_INTERVAL;
    }

    return clampHelloInterval(configuration.helloInterval);
  }

  private getRouteTimeout() {
    const configuration = getAodvConfiguration(this.peer.getEntity());
    if (!configuration) {
      return AODV_MIN_ROUTE_TIMEOUT;
    }

    return clampRouteTimeout(configuration.routeTimeout);
  }

  private getHelloLifetime() {
    return Math.max(this.getRouteTimeout(), this.getHelloInterval() * AODV_HELLO_LIFETIME_FACTOR);
  }
}
