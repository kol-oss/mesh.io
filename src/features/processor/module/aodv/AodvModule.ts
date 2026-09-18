import {
  type AodvCalculationEventDetails,
  type AodvControlMessage,
  type AodvHelloMessage,
  type AodvRouteChangeEventDetails,
  type AodvRouteErrorMessage,
  type AodvRouteRecord,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
  type AodvUnreachableDestination,
} from "@/features/processor/types/protocols/aodv";
import type { EventRecorder } from "@/features/processor/types/recorder";
import {
  AODV_ACTIVE_ROUTE_TIMEOUT,
  AODV_DELETE_PERIOD,
  AODV_HELLO_LIFETIME_FACTOR,
  AODV_PATH_DISCOVERY_TTL,
  AODV_SEQUENCE_INITIAL,
} from "@/shared/constants/protocols/aodv";
import {
  DropReason,
  EventType,
  type BroadcastEventDetails,
  type DropEventDetails,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { AodvConfiguration } from "@/shared/types/model/configurations";
import { RoutingStructure, type RoutingStructureType } from "../../types/module";
import type { NetworkGraph } from "../../types/network/graph";
import { clone } from "../../utils/clone";
import { BaseModule } from "../BaseModule";
import { RouteRequestCache } from "./structures/RouteRequestCache";
import { RoutingTable, type AodvRouteEntry } from "./structures/RoutingTable";

const PROTOCOL = RoutingProtocol.AODV;

export class AodvModule extends BaseModule {
  // routing structures
  private routingTable!: RoutingTable;
  private requestCache!: RouteRequestCache;

  // sequence numbers
  private sequence: number = AODV_SEQUENCE_INITIAL;
  private rreqId: number = 0;

  constructor(peerId: UUID, graph: NetworkGraph, eventRecorder: EventRecorder) {
    super(peerId, graph, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(
      MessageType.AodvRouteRequestMessage,
      MessageType.AodvRouteReplyMessage,
      MessageType.AodvHelloMessage,
      MessageType.AodvRouteErrorMessage,
    );
  }

  // initialization of routing table and request cache
  override init() {
    this.routingTable = new RoutingTable();
    this.requestCache = new RouteRequestCache();
    this.initializeSelfRoute();
  }

  override process(message: Message): boolean {
    const { type: messageType } = message;

    // packet payload
    if (messageType === MessageType.Packet) {
      if (message.destinationPeerId === this.peerId) {
        return true;
      }

      const forwardedPacket: Packet = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.processPacketWithDiscovery(forwardedPacket);
    }

    // RREQ message
    if (messageType === MessageType.AodvRouteRequestMessage) {
      return this.processRouteRequest(message as AodvRouteRequestMessage);
    }

    // RREP message
    if (messageType === MessageType.AodvRouteReplyMessage) {
      return this.processRouteReply(message as AodvRouteReplyMessage);
    }

    // HELLO message
    if (messageType === MessageType.AodvHelloMessage) {
      return this.processHello(message as AodvHelloMessage);
    }

    // RERR message
    if (messageType === MessageType.AodvRouteErrorMessage) {
      return this.processRouteError(message as AodvRouteErrorMessage);
    }

    return false;
  }

  private processPacketWithDiscovery(packet: Packet): boolean {
    if (packet.timeToLive <= 0) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(packet),
          reason: DropReason.TimeToLiveExceeded,
        },
        PROTOCOL,
      );
      return false;
    }

    let route = this.getUsableRoute(packet.destinationPeerId);
    if (!route) {
      // only the originator may start discovery; an intermediate node with an invalid/missing
      // route should not flood RREQ - link-break RERR was already (or will be) sent (RFC 3561 §6.11)
      const isOriginator = packet.sourcePeerId === this.peerId;
      if (isOriginator || !this.routingTable.get(packet.destinationPeerId)) {
        route = this.discoverRoute(packet.destinationPeerId);
      }
    }

    if (!route) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(packet),
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
        message: clone(packet),
      } as GetRouteEventDetails,
      PROTOCOL,
    );

    return this.writePacket(packet, route.nextHopId);
  }

  // processing and forwarding Route Requests
  private processRouteRequest(message: AodvRouteRequestMessage): boolean {
    const {
      sourcePeerId: sourceId,
      senderPeerId: senderId,
      destinationPeerId: destinationId,
      hopCount,
      originatorSequenceNumber: originatorSequence,
      requestId,
    } = message;
    const tick = this.eventRecorder.getCurrentTick();

    // duplicate RREQ - already processed this request
    if (this.requestCache.has(sourceId, destinationId, requestId)) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(message),
          reason: DropReason.Duplicate,
        } satisfies DropEventDetails,
        PROTOCOL,
      );
      return true;
    }

    this.requestCache.put(sourceId, destinationId, requestId, tick, AODV_ACTIVE_ROUTE_TIMEOUT);

    // establish or update reverse route to the originator
    this.upsertRoute(
      sourceId,
      senderId,
      hopCount + 1,
      originatorSequence,
      true,
      message,
      AODV_ACTIVE_ROUTE_TIMEOUT,
    );

    const replyMessage = this.buildRouteReplyForRequest(message);
    if (replyMessage) {
      return this.emitRouteReply(replyMessage);
    }

    return this.forwardRouteRequest(message);
  }

  // receiving and forwarding Route Replies
  private processRouteReply(message: AodvRouteReplyMessage): boolean {
    const {
      destinationPeerId: destinationId,
      senderPeerId: senderId,
      originatorPeerId: originatorId,
      hopCount,
      destinationSequenceNumber: destinationSequence,
      lifetime,
    } = message;

    // update forward route to destination
    this.upsertRoute(
      destinationId,
      senderId,
      hopCount + 1,
      destinationSequence,
      true,
      message,
      lifetime,
    );

    // this node is the originator - route is installed
    if (originatorId === this.peerId) {
      return true;
    }

    // forward RREP toward originator via reverse route
    const reverseRoute = this.getUsableRoute(originatorId);
    if (!reverseRoute) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(message),
          reason: DropReason.NoRoute,
        } satisfies DropEventDetails,
        PROTOCOL,
      );
      return false;
    }

    const forwarded: AodvRouteReplyMessage = {
      ...message,
      senderPeerId: this.peerId,
      targetPeerId: reverseRoute.nextHopId,
      hopCount: hopCount + 1,
    };

    return this.emitRouteReply(forwarded);
  }

  // hello messages
  private processHello(message: AodvHelloMessage): boolean {
    const {
      sourcePeerId: sourceId,
      senderPeerId: senderId,
      destinationSequenceNumber: destinationSequence,
      lifetime,
    } = message;

    // install or refresh direct-neighbour route from HELLO
    this.upsertRoute(sourceId, senderId, 1, destinationSequence, true, message, lifetime);

    return true;
  }

  // route error (RERR) messages
  private processRouteError(message: AodvRouteErrorMessage): boolean {
    const { senderPeerId: senderId } = message;

    const recipients = new Set<UUID>();
    const propagatedDestinations: AodvUnreachableDestination[] = [];

    for (const {
      destinationPeerId: destinationId,
      sequenceNumber,
    } of message.unreachableDestinations) {
      const route = this.routingTable.get(destinationId);
      if (!route || route.nextHopId !== senderId) {
        continue;
      }

      for (const precursorId of route.precursors) {
        if (precursorId !== senderId) {
          recipients.add(precursorId);
        }
      }

      propagatedDestinations.push({
        destinationPeerId: destinationId,
        sequenceNumber: Math.max(sequenceNumber, route.sequence + 1),
      });

      // RFC 3561 §6.11 - invalidate route on received RERR, keep for DELETE_PERIOD
      this.invalidateRoute(destinationId, Math.max(sequenceNumber, route.sequence + 1));
    }

    if (propagatedDestinations.length === 0) {
      return true;
    }

    this.propagateRouteError(propagatedDestinations, [...recipients], message.sourcePeerId);

    return true;
  }

  // decide whether this node (or an intermediate) can answer the RREQ
  private buildRouteReplyForRequest(
    message: AodvRouteRequestMessage,
  ): AodvRouteReplyMessage | null {
    const { routeTimeout } = this.peer.configuration as AodvConfiguration;
    const {
      sourcePeerId: sourceId,
      senderPeerId: senderId,
      destinationPeerId: destinationId,
      destinationSequenceNumber: destinationSequence,
    } = message;

    // destination node responds with its own fresh sequence
    if (this.peerId === destinationId) {
      if (destinationSequence === this.sequence) {
        this.sequence += 1;
        this.initializeSelfRoute();
      }

      return this.buildRouteReplyMessage(
        sourceId,
        senderId,
        destinationId,
        this.sequence,
        0,
        routeTimeout,
        false,
      );
    }

    // intermediate node with a valid, fresh-enough route
    const route = this.getUsableRoute(destinationId);
    if (!route) {
      return null;
    }

    if (destinationSequence !== null && route.sequence < destinationSequence) {
      return null;
    }

    return this.buildRouteReplyMessage(
      sourceId,
      senderId,
      route.destinationId,
      route.sequence,
      route.hopCount,
      routeTimeout,
      true,
    );
  }

  private buildRouteReplyMessage(
    originatorId: UUID,
    targetId: UUID,
    destinationId: UUID,
    destinationSequence: number,
    hopCount: number,
    lifetime: number,
    gratuitous: boolean,
  ): AodvRouteReplyMessage {
    return {
      type: MessageType.AodvRouteReplyMessage,
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
      targetPeerId: targetId,
      destinationPeerId: destinationId,
      destinationSequenceNumber: destinationSequence,
      originatorPeerId: originatorId,
      hopCount,
      lifetime,
      gratuitous,
    };
  }

  // record Calculation event and unicast RREP to the next hop
  private emitRouteReply(message: AodvRouteReplyMessage): boolean {
    this.recordEvent(
      EventType.Calculation,
      {
        message: clone(message),
      } satisfies AodvCalculationEventDetails,
      PROTOCOL,
    );

    return super.write(message, message.targetPeerId);
  }

  // rebroadcast RREQ to neighbours excluding the sender
  private forwardRouteRequest(message: AodvRouteRequestMessage): boolean {
    if (message.hopCount >= AODV_PATH_DISCOVERY_TTL) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(message),
          reason: DropReason.TimeToLiveExceeded,
        } satisfies DropEventDetails,
        PROTOCOL,
      );
      return false;
    }

    const { senderPeerId: senderId } = message;
    const neighbours = this.graph
      .getNeighbours(this.peer.id)
      .filter((neighbour) => neighbour.id !== senderId && neighbour.protocol === PROTOCOL);

    const forwarded: AodvRouteRequestMessage = {
      ...message,
      senderPeerId: this.peerId,
      hopCount: message.hopCount + 1,
    };

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((neighbour) => neighbour.id),
        retransmit: true,
        message: clone(forwarded),
      } satisfies BroadcastEventDetails,
      PROTOCOL,
    );

    let result = true;
    for (const neighbour of neighbours) {
      result = super.write(forwarded, neighbour.id) && result;
    }

    return result;
  }

  // originator-side RREQ flood; RREP propagates back via processRouteReply
  private discoverRoute(destinationId: UUID): AodvRouteEntry | null {
    this.sequence += 1;
    this.rreqId += 1;
    this.initializeSelfRoute();

    const tick = this.eventRecorder.getCurrentTick();
    const requestedSequence = this.getRequestedDestinationSequence(destinationId);

    const rreq: AodvRouteRequestMessage = {
      type: MessageType.AodvRouteRequestMessage,
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
      destinationPeerId: destinationId,
      requestId: this.rreqId,
      hopCount: 0,
      destinationSequenceNumber: requestedSequence,
      originatorSequenceNumber: this.sequence,
    };

    // pre-cache own RREQ to suppress bounced-back duplicates
    this.requestCache.put(this.peerId, destinationId, this.rreqId, tick, AODV_ACTIVE_ROUTE_TIMEOUT);

    const neighbours = this.graph
      .getNeighbours(this.peerId)
      .filter((neighbour) => neighbour.protocol === PROTOCOL && neighbour.active);

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((neighbour) => neighbour.id),
        retransmit: false,
        message: clone(rreq),
      } satisfies BroadcastEventDetails,
      PROTOCOL,
    );

    for (const neighbour of neighbours) {
      super.write(rreq, neighbour.id);
    }

    return this.getUsableRoute(destinationId);
  }

  // forward data packet and track precursors for RERR
  private writePacket(packet: Packet, hopId: UUID): boolean {
    this.routingTable.addPrecursor(packet.destinationPeerId, this.peerId);
    const delivered = super.write(packet, hopId);
    if (!delivered) {
      this.handleLinkBreak(hopId);
    }
    return delivered;
  }

  // detect and react to a broken next-hop link (RFC 3561 §6.11)
  private handleLinkBreak(nextHopId: UUID) {
    // only valid routes need processing - already-invalid ones were reported on a previous break
    const affectedRoutes = [...this.routingTable.values()].filter(
      (route) =>
        route.destinationId !== this.peerId && route.nextHopId === nextHopId && route.valid,
    );
    if (affectedRoutes.length === 0) {
      return;
    }

    const recipients = new Set<UUID>();
    const unreachableDestinations: AodvUnreachableDestination[] = [];

    for (const route of affectedRoutes) {
      const newSequence = route.sequence + 1;

      for (const precursorId of route.precursors) {
        recipients.add(precursorId);
      }

      unreachableDestinations.push({
        destinationPeerId: route.destinationId,
        sequenceNumber: newSequence,
      });

      // RFC 3561 §6.11 - invalidate, retain for DELETE_PERIOD; do NOT delete immediately
      this.invalidateRoute(route.destinationId, newSequence);
    }

    this.propagateRouteError(unreachableDestinations, [...recipients], this.peerId);
  }

  private propagateRouteError(
    unreachableDestinations: AodvUnreachableDestination[],
    recipientPeerIds: UUID[],
    sourcePeerId: UUID,
  ) {
    if (unreachableDestinations.length === 0) {
      return;
    }

    const errorMessage: AodvRouteErrorMessage = {
      type: MessageType.AodvRouteErrorMessage,
      sourcePeerId,
      senderPeerId: this.peerId,
      targetPeerId: recipientPeerIds.length === 1 ? recipientPeerIds[0] : null,
      unreachableDestinations: unreachableDestinations.map((entry) => ({ ...entry })),
      noDelete: false,
    };

    // always record the RERR event so link breaks are visible even with no precursors (RFC 3561 §6.11)
    if (recipientPeerIds.length > 1) {
      this.recordEvent(
        EventType.Broadcast,
        {
          neighbourPeerIds: recipientPeerIds,
          retransmit: sourcePeerId !== this.peerId,
          message: clone(errorMessage),
        } satisfies BroadcastEventDetails,
        PROTOCOL,
      );
    } else {
      this.recordEvent(
        EventType.Calculation,
        {
          message: clone(errorMessage),
        } satisfies AodvCalculationEventDetails,
        PROTOCOL,
      );
    }

    for (const recipientPeerId of recipientPeerIds) {
      super.write(errorMessage, recipientPeerId);
    }
  }

  // upsert route table entry
  private upsertRoute(
    destinationId: UUID,
    nextHopId: UUID,
    hopCount: number,
    sequenceNumber: number,
    validSequence: boolean,
    message: AodvControlMessage,
    lifetime: number,
  ) {
    if (destinationId === this.peerId) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const previousRoute = this.routingTable.get(destinationId) ?? null;
    const nextRoute: AodvRouteEntry = {
      destinationId,
      nextHopId,
      hopCount,
      sequence: sequenceNumber,
      lastUpdateTick: currentTick,
      timeout: Math.max(1, lifetime),
      validSequence,
      valid: true,
      precursors: [...(previousRoute?.precursors ?? [])],
    };

    if (!this.shouldAdoptRoute(previousRoute, nextRoute)) {
      // route not adopted, but still refresh lifetime if route already exists
      if (previousRoute) {
        this.routingTable.set(destinationId, {
          ...previousRoute,
          lastUpdateTick: currentTick,
          timeout: Math.max(1, lifetime),
        });
      }
      return;
    }

    this.routingTable.set(destinationId, nextRoute);

    if (!previousRoute) {
      this.recordEvent(
        EventType.AddRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId: destinationId,
          nextHopPeerId: nextHopId,
          previousRoute: null,
          nextRoute: this.toPublicRoute(nextRoute),
          message: clone(message),
        } satisfies AodvRouteChangeEventDetails,
        PROTOCOL,
      );
      return;
    }

    this.recordEvent(
      EventType.UpdateRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId: destinationId,
        nextHopPeerId: nextHopId,
        previousRoute: this.toPublicRoute(previousRoute),
        nextRoute: this.toPublicRoute(nextRoute),
        message: clone(message),
      } satisfies AodvRouteChangeEventDetails,
      PROTOCOL,
    );
  }

  // RFC 3561 §6.11 - mark route as invalid, retain for DELETE_PERIOD (no immediate deletion)
  private invalidateRoute(destinationId: UUID, newSequence: number) {
    const previousRoute = this.routingTable.get(destinationId);
    if (!previousRoute || destinationId === this.peerId || !previousRoute.valid) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const invalidated: AodvRouteEntry = {
      ...previousRoute,
      valid: false,
      sequence: newSequence,
      lastUpdateTick: currentTick,
      timeout: AODV_DELETE_PERIOD,
    };

    this.routingTable.set(destinationId, invalidated);
    this.recordEvent(
      EventType.UpdateRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId: destinationId,
        nextHopPeerId: previousRoute.nextHopId,
        previousRoute: this.toPublicRoute(previousRoute),
        nextRoute: this.toPublicRoute(invalidated),
      } satisfies AodvRouteChangeEventDetails,
      PROTOCOL,
    );
  }

  private removeRoute(destinationId: UUID, message: AodvRouteErrorMessage | null) {
    const previousRoute = this.routingTable.get(destinationId);
    if (!previousRoute || destinationId === this.peerId) {
      return;
    }

    this.routingTable.delete(destinationId);
    this.recordEvent(
      EventType.DeleteRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId: destinationId,
        nextHopPeerId: previousRoute.nextHopId,
        previousRoute: this.toPublicRoute(previousRoute),
        nextRoute: null,
        message: message ? clone(message) : undefined,
      } satisfies AodvRouteChangeEventDetails,
      PROTOCOL,
    );
  }

  // route adoption decision (sequence, validity, hop-count)
  private shouldAdoptRoute(previous: AodvRouteEntry | null, next: AodvRouteEntry): boolean {
    if (!previous) {
      return true;
    }

    if (!previous.validSequence && next.validSequence) {
      return true;
    }

    if (next.sequence > previous.sequence) {
      return true;
    }

    if (next.sequence === previous.sequence) {
      if (!previous.valid) {
        return true;
      }

      if (next.hopCount < previous.hopCount) {
        return true;
      }

      return next.nextHopId !== previous.nextHopId;
    }

    return false;
  }

  // initialize or refresh the self-route entry
  private initializeSelfRoute() {
    const { routeTimeout } = this.peer.configuration as AodvConfiguration;
    const currentTick = this.eventRecorder.getCurrentTick();

    this.routingTable.set(this.peerId, {
      destinationId: this.peerId,
      nextHopId: this.peerId,
      hopCount: 0,
      sequence: this.sequence,
      lastUpdateTick: currentTick,
      timeout: routeTimeout,
      validSequence: true,
      valid: true,
      precursors: [],
    });
  }

  private getRequestedDestinationSequence(destinationId: UUID): number | null {
    const route = this.routingTable.get(destinationId);
    if (!route || !route.validSequence) {
      return null;
    }

    return route.sequence;
  }

  // look up a valid, protocol-compatible route entry; validity is maintained by processTick/handleLinkBreak
  private getUsableRoute(destinationId: UUID): AodvRouteEntry | null {
    const route = this.routingTable.get(destinationId) ?? null;
    if (!route || !route.valid || destinationId === this.peerId) {
      return route?.destinationId === this.peerId ? route : null;
    }

    return route;
  }

  // extend route lifetime when actively forwarding
  private touchRoute(destinationId: UUID) {
    const { routeTimeout } = this.peer.configuration as AodvConfiguration;
    this.routingTable.touch(destinationId, this.eventRecorder.getCurrentTick(), routeTimeout);
  }

  private toPublicRoute(route: AodvRouteEntry): AodvRouteRecord {
    return {
      destinationId: route.destinationId,
      nextHopId: route.nextHopId,
      hopCount: route.hopCount,
      sequence: route.sequence,
      lastUpdateTick: route.lastUpdateTick,
      validSequence: route.validSequence,
      valid: route.valid,
      precursors: [...route.precursors],
    };
  }

  override send(packet: Packet): boolean {
    if (!this.peer.active) {
      this.recordEvent(
        EventType.Drop,
        {
          message: clone(packet),
          reason: DropReason.DestinationUnavailable,
        } satisfies DropEventDetails,
        PROTOCOL,
      );
      return false;
    }

    const sourcePacket: Packet =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.peerId } : packet;

    if (sourcePacket.destinationPeerId === this.peerId) {
      return true;
    }

    return this.processPacketWithDiscovery(sourcePacket);
  }

  override getRoute(destinationId: UUID): UUID | null {
    return this.getUsableRoute(destinationId)?.nextHopId ?? null;
  }

  // broadcasts HELLO messages to maintain neighbour routes
  override processRefresh() {
    this.refreshHello();
  }

  // broadcasts HELLO message to all AODV neighbours
  private refreshHello() {
    if (!this.peer.active) {
      return;
    }

    const neighbours = this.graph
      .getNeighbours(this.peerId)
      .filter((neighbour) => neighbour.protocol === PROTOCOL);

    const { helloInterval, routeTimeout } = this.peer.configuration as AodvConfiguration;
    const helloLifetime = Math.max(routeTimeout, helloInterval * AODV_HELLO_LIFETIME_FACTOR);

    const helloMessage: AodvHelloMessage = {
      type: MessageType.AodvHelloMessage,
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
      destinationSequenceNumber: this.sequence,
      lifetime: helloLifetime,
      interval: helloInterval,
    };

    this.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((neighbour) => neighbour.id),
        retransmit: false,
        message: clone(helloMessage),
      } satisfies BroadcastEventDetails,
      PROTOCOL,
    );

    for (const neighbour of neighbours) {
      super.write(helloMessage, neighbour.id);
    }
  }

  override processTick() {
    const currentTick = this.eventRecorder.getCurrentTick();

    this.requestCache.tick(currentTick);
    const brokenNextHops = new Set<UUID>();

    for (const [destinationId, route] of this.routingTable.entries()) {
      if (destinationId === this.peerId) {
        continue;
      }

      // expire stale routes
      if (route.lastUpdateTick + route.timeout <= currentTick) {
        this.removeRoute(destinationId, null);
        continue;
      }

      const nextHop = this.graph
        .getNeighbours(this.peerId)
        .find((neighbour) => neighbour.id === route.nextHopId);
      // only trigger break for valid routes - invalid ones are already handled (RFC 3561 §6.11)
      if (route.valid && (!nextHop || nextHop.protocol !== PROTOCOL)) {
        brokenNextHops.add(route.nextHopId);
      }
    }

    for (const nextHopId of brokenNextHops) {
      this.handleLinkBreak(nextHopId);
    }
  }

  override getTables(): RoutingStructureType {
    const tables: RoutingStructureType = {} as RoutingStructureType;
    tables[RoutingStructure.AodvRoutingTable] = this.routingTable.getRoutes(this.peerId);
    return tables;
  }
}
