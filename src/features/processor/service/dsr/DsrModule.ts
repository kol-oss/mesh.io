import type { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type DsrRouteErrorMessage,
  type DsrRouteRecord,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import {
  DSR_DEFAULT_HOP_LIMIT,
  DSR_MAX_REDISCOVERY_ATTEMPTS,
  DSR_MAX_SALVAGE_COUNT,
  DSR_MIN_ROUTE_TIMEOUT,
} from "@/shared/constants/protocols/dsr";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import { getDsrConfiguration } from "@/shared/types/model/peers";
import type { NodeWrapper } from "../../types/node";
import { BaseModule } from "../BaseModule";
import { RouteCache } from "./structures/RouteCache";

const PROTOCOL = RoutingProtocol.DSR;

const cloneDsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.type === MessageType.DsrRouteRequestMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.type === MessageType.DsrRouteReplyMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.type === MessageType.DsrRouteErrorMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
  };
};

const isDsrSimulationMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    candidate.type === MessageType.Packet ||
    candidate.type === MessageType.DsrRouteRequestMessage ||
    candidate.type === MessageType.DsrRouteReplyMessage ||
    candidate.type === MessageType.DsrRouteErrorMessage
  );
};

type DiscoveryResult = {
  pathPeerIds: UUID[];
  requestId: number;
};

export class DsrModule extends BaseModule {
  private readonly routeCache = new RouteCache();

  private requestSequence = 0;

  constructor(routingPeer: NodeWrapper, eventRecorder: EventRecorder) {
    super(routingPeer, eventRecorder);
  }

  override read(message: Message): boolean {
    if (!isDsrSimulationMessage(message)) {
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

      return this.send(forwardedPacket);
    }

    return true;
  }

  override refresh() {
    // DSR is reactive; no periodic refresh traffic is generated.
  }

  override tick() {
    super.tick();
    if (!this.peer.isActive()) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const routeTimeout = this.getRouteTimeout();
    const expiredRoutes = this.routeCache.removeExpired(this.peer.id, currentTick, routeTimeout);

    for (const { destinationPeerId, route } of expiredRoutes) {
      this.eventRecorder.record(
        this.peer.id,
        EventType.DeleteRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId,
          nextHopPeerId: route.nextHopPeerId,
          previousRoute: route,
          nextRoute: null,
          reason: `DSR Route Cache entry expired after ${routeTimeout} ticks without reuse.`,
        },
        PROTOCOL,
      );
    }
  }

  override send(packet: Packet): boolean {
    if (!this.peer.isActive()) {
      this.recordDrop(packet, DropReason.DestinationUnavailable);
      return false;
    }

    if (packet.timeToLive <= 0) {
      this.recordDrop(packet, DropReason.TimeToLiveExceeded);
      return false;
    }

    const sourcePacket: Packet =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.peer.id } : packet;

    if (sourcePacket.destinationPeerId === this.peer.id) {
      return true;
    }

    for (let attempt = 0; attempt < DSR_MAX_REDISCOVERY_ATTEMPTS; attempt += 1) {
      let route = this.getUsableRoute(sourcePacket.destinationPeerId);
      if (!route) {
        const discovery = this.discoverRoute(sourcePacket.destinationPeerId);
        if (!discovery) {
          continue;
        }

        route = this.getUsableRoute(sourcePacket.destinationPeerId);
      }

      if (!route) {
        continue;
      }

      const delivered = this.forwardPacketOnRoute(sourcePacket, route.pathPeerIds, 0);
      if (delivered) {
        return true;
      }
    }

    this.recordDrop(sourcePacket, DropReason.NoRoute);

    return false;
  }

  override getRoute(destinationPeerId: UUID): UUID | null {
    return this.routeCache.get(destinationPeerId)?.nextHopPeerId ?? null;
  }

  getRoutes() {
    return this.routeCache.getAll();
  }

  private discoverRoute(destinationPeerId: UUID): DiscoveryResult | null {
    this.requestSequence += 1;
    const requestId = this.requestSequence;

    const queue: Array<{ peer: NodeWrapper; pathPeerIds: UUID[] }> = [
      { peer: this.peer, pathPeerIds: [this.peer.id] },
    ];

    const discoveredDepthByPeer = new Map<UUID, number>([[this.peer.id, 0]]);
    let discoveredPath: UUID[] | null = null;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      const currentDepth = current.pathPeerIds.length - 1;
      const neighbours = current.peer
        .getNeighbours()
        .filter((peer) => peer.supports(RoutingProtocol.DSR) && peer.isActive());

      const requestMessage: DsrRouteRequestMessage = {
        type: MessageType.DsrRouteRequestMessage,
        sourcePeerId: this.peer.id,
        senderPeerId: current.peer.id,
        targetPeerId: destinationPeerId,
        requestId,
        hopLimit: Math.max(0, DSR_DEFAULT_HOP_LIMIT - currentDepth),
        routePeerIds: [...current.pathPeerIds],
      };

      this.eventRecorder.record(
        current.peer.id,
        EventType.Broadcast,
        {
          neighbourPeerIds: neighbours.map((peer) => peer.id),
          retransmit: current.peer.id !== this.peer.id,
          message: cloneDsrMessage(requestMessage),
          note:
            current.peer.id === this.peer.id
              ? `DSR Route Request ${requestId} flooded for destination ${destinationPeerId}.`
              : `Forwarded DSR Route Request ${requestId}.`,
        },
        PROTOCOL,
      );

      if (current.peer.id === destinationPeerId && !discoveredPath) {
        discoveredPath = current.pathPeerIds;
      }

      for (const neighbour of neighbours) {
        if (current.pathPeerIds.includes(neighbour.id)) {
          continue;
        }

        const nextDepth = currentDepth + 1;
        const knownDepth = discoveredDepthByPeer.get(neighbour.id);
        if (knownDepth !== undefined && knownDepth <= nextDepth) {
          continue;
        }

        discoveredDepthByPeer.set(neighbour.id, nextDepth);
        const nextPath = [...current.pathPeerIds, neighbour.id];

        if (neighbour.id === destinationPeerId && !discoveredPath) {
          discoveredPath = nextPath;
        }

        queue.push({ peer: neighbour, pathPeerIds: nextPath });
      }
    }

    if (!discoveredPath) {
      return null;
    }

    this.broadcastRouteReply(discoveredPath, requestId);
    this.seedRouteCaches(discoveredPath, requestId);

    return {
      pathPeerIds: discoveredPath,
      requestId,
    };
  }

  private broadcastRouteReply(pathPeerIds: UUID[], requestId: number) {
    const modulesAlongPath = this.getModulesAlongPath(pathPeerIds);
    for (let index = pathPeerIds.length - 1; index > 0; index -= 1) {
      const senderPeerId = pathPeerIds[index];
      const previousPeerId = pathPeerIds[index - 1];
      const senderModule = modulesAlongPath[index] ?? null;
      const senderPeer = senderModule?.peer;
      if (!senderPeer) {
        continue;
      }

      const replyMessage: DsrRouteReplyMessage = {
        type: MessageType.DsrRouteReplyMessage,
        sourcePeerId: pathPeerIds[0],
        senderPeerId,
        targetPeerId: pathPeerIds[pathPeerIds.length - 1],
        requestId,
        hopLimit: index,
        routePeerIds: [...pathPeerIds],
      };

      this.eventRecorder.record(
        senderPeerId,
        EventType.Calculation,
        {
          message: cloneDsrMessage(replyMessage),
          reason: `DSR Route Reply ${requestId} unicast to ${previousPeerId} carrying source route ${pathPeerIds.join(" -> ")}.`,
        },
        PROTOCOL,
      );
    }
  }

  private seedRouteCaches(pathPeerIds: UUID[], requestId: number) {
    const modulesAlongPath = this.getModulesAlongPath(pathPeerIds);
    for (let index = 0; index < pathPeerIds.length; index += 1) {
      const module = modulesAlongPath[index] ?? null;
      if (!module) {
        continue;
      }

      const forwardPath = pathPeerIds.slice(index);
      const reversePath = [...pathPeerIds.slice(0, index + 1)].reverse();

      const discoveryMessage: DsrRouteReplyMessage = {
        type: MessageType.DsrRouteReplyMessage,
        sourcePeerId: pathPeerIds[0],
        senderPeerId: pathPeerIds[pathPeerIds.length - 1],
        targetPeerId: pathPeerIds[pathPeerIds.length - 1],
        requestId,
        hopLimit: pathPeerIds.length - index,
        routePeerIds: [...pathPeerIds],
      };

      module.upsertRoute(
        pathPeerIds[pathPeerIds.length - 1],
        forwardPath,
        discoveryMessage,
        `DSR Route Reply ${requestId} installed route to destination ${pathPeerIds[pathPeerIds.length - 1]}.`,
      );

      module.upsertRoute(
        pathPeerIds[0],
        reversePath,
        discoveryMessage,
        `DSR Route Reply ${requestId} cached reverse path to initiator ${pathPeerIds[0]}.`,
      );
    }
  }

  private forwardPacketOnRoute(
    packet: Packet,
    routePeerIds: UUID[],
    salvageCount: number,
  ): boolean {
    if (routePeerIds.length < 2) {
      return packet.destinationPeerId === this.peer.id;
    }

    let currentPeer = this.peer;
    let currentPacket = { ...packet };

    for (let index = 0; index < routePeerIds.length - 1; index += 1) {
      const currentPeerId = routePeerIds[index];
      const nextPeerId = routePeerIds[index + 1];

      if (currentPeer.id !== currentPeerId) {
        const alignedPeer = currentPeer.getNeighbour(currentPeerId);
        if (!alignedPeer) {
          this.eventRecorder.record(
            currentPeer.id,
            EventType.Drop,
            {
              message: cloneDsrMessage(currentPacket),
              reason: DropReason.NoRoute,
            },
            PROTOCOL,
          );
          return false;
        }
        currentPeer = alignedPeer;
      }

      if (currentPacket.timeToLive <= 0) {
        this.eventRecorder.record(
          currentPeer.id,
          EventType.Drop,
          {
            message: cloneDsrMessage(currentPacket),
            reason: DropReason.TimeToLiveExceeded,
          },
          PROTOCOL,
        );
        return false;
      }

      const selectedRoute: DsrRouteRecord = {
        destinationPeerId: packet.destinationPeerId,
        nextHopPeerId: nextPeerId,
        metric: routePeerIds.length - index - 1,
        sequenceNumber: this.requestSequence,
        lastUpdateTick: this.eventRecorder.getCurrentTick(),
        pathPeerIds: routePeerIds.slice(index),
      };

      this.eventRecorder.record(
        currentPeer.id,
        EventType.GetRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId: packet.destinationPeerId,
          selectedRoute,
          message: cloneDsrMessage(currentPacket),
        } as GetRouteEventDetails,
        PROTOCOL,
      );

      const nextPeer = currentPeer.getNeighbour(nextPeerId);
      if (!nextPeer || !nextPeer.supports(RoutingProtocol.DSR)) {
        const routeError = this.createRouteError(packet, currentPeerId, nextPeerId, salvageCount);
        this.eventRecorder.record(
          currentPeer.id,
          EventType.Drop,
          {
            message: cloneDsrMessage(routeError),
            reason: !nextPeer ? DropReason.NoRoute : DropReason.UnsupportedProtocol,
          },
          PROTOCOL,
        );

        this.invalidateRoutesAcrossPath(routePeerIds, currentPeerId, nextPeerId, routeError);

        if (salvageCount < DSR_MAX_SALVAGE_COUNT) {
          const salvageRoute = this.getUsableRoute(packet.destinationPeerId, {
            excludedLink: [currentPeerId, nextPeerId],
          });
          if (salvageRoute) {
            const prefix = routePeerIds.slice(0, index + 1);
            const salvagedPath = [...prefix, ...salvageRoute.pathPeerIds.slice(1)];
            this.eventRecorder.record(
              currentPeer.id,
              EventType.Calculation,
              {
                message: cloneDsrMessage(routeError),
                reason: `DSR packet salvaging reused cached alternate route ${salvagedPath.join(" -> ")}.`,
              },
              PROTOCOL,
            );

            return this.forwardPacketOnRoute(currentPacket, salvagedPath, salvageCount + 1);
          }
        }

        return false;
      }

      const forwardedPacket = {
        ...currentPacket,
        sourcePeerId: currentPacket.sourcePeerId ?? routePeerIds[0],
        timeToLive: currentPacket.timeToLive - 1,
      };

      this.eventRecorder.record(
        currentPeer.id,
        EventType.Transfer,
        {
          protocol: PROTOCOL,
          sourcePeerId: currentPeer.id,
          targetPeerId: nextPeerId,
          message: cloneDsrMessage(forwardedPacket),
        },
        PROTOCOL,
      );

      currentPacket = forwardedPacket;
      currentPeer = nextPeer;
    }

    return currentPeer.id === packet.destinationPeerId;
  }

  private getUsableRoute(destinationPeerId: UUID, options?: { excludedLink?: [UUID, UUID] }) {
    return this.routeCache.findUsable(this.peer.id, destinationPeerId, options);
  }

  private upsertRoute(
    destinationPeerId: UUID,
    pathPeerIds: UUID[],
    message: DsrRouteRequestMessage | DsrRouteReplyMessage,
    reason: string,
  ) {
    const upsertResult = this.routeCache.upsert(
      this.peer.id,
      destinationPeerId,
      pathPeerIds,
      message.requestId,
      this.eventRecorder.getCurrentTick(),
    );
    if (!upsertResult) {
      return;
    }

    const { previousRoute, nextRoute, changed } = upsertResult;

    if (!previousRoute) {
      this.recordEvent(
        EventType.AddRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId,
          nextHopPeerId: nextRoute.nextHopPeerId,
          previousRoute: null,
          nextRoute,
          message: cloneDsrMessage(message),
          reason,
        },
        PROTOCOL,
      );
      return;
    }

    if (changed) {
      this.recordEvent(
        EventType.UpdateRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId,
          nextHopPeerId: nextRoute.nextHopPeerId,
          previousRoute,
          nextRoute,
          message: cloneDsrMessage(message),
          reason,
        },
        PROTOCOL,
      );
    }
  }

  private createRouteError(
    packet: Packet,
    brokenFromPeerId: UUID,
    brokenToPeerId: UUID,
    salvageCount: number,
  ): DsrRouteErrorMessage {
    return {
      type: MessageType.DsrRouteErrorMessage,
      sourcePeerId: packet.sourcePeerId ?? this.peer.id,
      senderPeerId: brokenFromPeerId,
      destinationPeerId: packet.destinationPeerId,
      brokenFromPeerId,
      brokenToPeerId,
      salvageCount,
      routePeerIds: [brokenFromPeerId, brokenToPeerId],
    };
  }

  private invalidateRoutesUsingLink(
    brokenFromPeerId: UUID,
    brokenToPeerId: UUID,
    message: DsrRouteErrorMessage,
  ) {
    const removed = this.routeCache.removeUsingBrokenLink(brokenFromPeerId, brokenToPeerId);
    for (const { destinationPeerId, route } of removed) {
      this.recordEvent(
        EventType.DeleteRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId,
          nextHopPeerId: route.nextHopPeerId,
          previousRoute: route,
          nextRoute: null,
          message: cloneDsrMessage(message),
          reason: `DSR Route Error invalidated cache entry using broken link ${brokenFromPeerId} -> ${brokenToPeerId}.`,
        },
        PROTOCOL,
      );
    }
  }

  private invalidateRoutesAcrossPath(
    pathPeerIds: UUID[],
    brokenFromPeerId: UUID,
    brokenToPeerId: UUID,
    message: DsrRouteErrorMessage,
  ) {
    const modulesAlongPath = this.getModulesAlongPath(pathPeerIds);
    for (const module of modulesAlongPath) {
      module.invalidateRoutesUsingLink(brokenFromPeerId, brokenToPeerId, message);
    }
  }

  private getModulesAlongPath(pathPeerIds: UUID[]) {
    const modules: DsrModule[] = [];
    let currentPeer: NodeWrapper | null = this.peer;

    for (let index = 0; index < pathPeerIds.length; index += 1) {
      const expectedPeerId = pathPeerIds[index];
      if (!currentPeer || currentPeer.id !== expectedPeerId) {
        break;
      }

      const module = currentPeer.getModule(RoutingProtocol.DSR);
      if (!(module instanceof DsrModule)) {
        break;
      }

      modules.push(module);

      if (index >= pathPeerIds.length - 1) {
        continue;
      }

      currentPeer = currentPeer.getNeighbour(pathPeerIds[index + 1]);
    }

    return modules;
  }

  private recordDrop(message: Packet | DsrRouteErrorMessage, reason: DropReason) {
    this.recordEvent(
      EventType.Drop,
      {
        message: cloneDsrMessage(message),
        reason,
      },
      PROTOCOL,
    );
  }

  private getRouteTimeout() {
    const configuration = getDsrConfiguration(this.peer.getEntity());
    if (!configuration) {
      throw new Error("DSR module requires a DSR peer entity.");
    }

    return Math.max(DSR_MIN_ROUTE_TIMEOUT, Math.floor(configuration.routeTimeout));
  }
}
