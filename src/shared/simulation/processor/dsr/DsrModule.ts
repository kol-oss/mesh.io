import {
  DSR_DEFAULT_HOP_LIMIT,
  DSR_MAX_REDISCOVERY_ATTEMPTS,
  DSR_MAX_SALVAGE_COUNT,
  DSR_ROUTE_CACHE_TIMEOUT,
} from "../../constants/dsr";import { RoutingProtocol } from "../../types/enums";
import {
  SimulationEventType,
  SimulationMessageKind,
  type DsrRouteErrorMessage,
  type DsrRouteRecord,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
  type SimulationPacket,
} from "../../types/simulation";
import type { UUID } from "../../types/uuid";
import { SimulationEventRecorder } from "../core/EventRecorder";
import type { PacketCapableModule, SimulationPeerNode } from "../core/runtimeTypes";
import { cloneDsrMessage, isDsrSimulationMessage } from "./dsrMessage";

type RouteCacheEntry = DsrRouteRecord;

type DiscoveryResult = {
  pathPeerIds: UUID[];
  requestId: number;
};

export class DsrModule implements PacketCapableModule {
  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private readonly routeCache = new Map<UUID, RouteCacheEntry>();

  private requestSequence = 0;

  constructor(routingPeer: SimulationPeerNode, eventRecorder: SimulationEventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
  }

  read(message: unknown): boolean {
    if (!isDsrSimulationMessage(message)) {
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

      return this.send(forwardedPacket);
    }

    return true;
  }

  refresh() {
    // DSR is reactive; no periodic refresh traffic is generated.
  }

  tick() {
    const currentTick = this.eventRecorder.getCurrentTick();
    for (const [destinationPeerId, route] of this.routeCache.entries()) {
      if (destinationPeerId === this.routingPeer.id) {
        continue;
      }

      if (currentTick - route.lastUpdateTick < DSR_ROUTE_CACHE_TIMEOUT) {
        continue;
      }

      this.routeCache.delete(destinationPeerId);
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableRemove, {
        protocol: RoutingProtocol.DSR,
        destinationPeerId,
        nextHopPeerId: route.nextHopPeerId,
        previousRoute: route,
        nextRoute: null,
        reason: `DSR Route Cache entry expired after ${DSR_ROUTE_CACHE_TIMEOUT} ticks without reuse.`,
      });
    }
  }

  send(packet: SimulationPacket): boolean {
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsrMessage(packet),
        reason: "Source peer is disabled",
      });
      return false;
    }

    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneDsrMessage(packet),
        reason: "Packet TTL reached zero",
      });
      return false;
    }

    const sourcePacket: SimulationPacket =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.routingPeer.id } : packet;

    if (sourcePacket.destinationPeerId === this.routingPeer.id) {
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

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
      message: cloneDsrMessage(sourcePacket),
      reason: "No DSR source route is available for the destination",
      reasonCode: "NO_ROUTE",
    });

    return false;
  }

  getRoutes() {
    return [...this.routeCache.values()].sort((left, right) =>
      left.destinationPeerId.localeCompare(right.destinationPeerId),
    );
  }

  private discoverRoute(destinationPeerId: UUID): DiscoveryResult | null {
    this.requestSequence += 1;
    const requestId = this.requestSequence;

    const queue: Array<{ peer: SimulationPeerNode; pathPeerIds: UUID[] }> = [
      { peer: this.routingPeer, pathPeerIds: [this.routingPeer.id] },
    ];

    const discoveredDepthByPeer = new Map<UUID, number>([[this.routingPeer.id, 0]]);
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
        kind: SimulationMessageKind.DsrRouteRequestMessage,
        sourcePeerId: this.routingPeer.id,
        senderPeerId: current.peer.id,
        targetPeerId: destinationPeerId,
        requestId,
        hopLimit: Math.max(0, DSR_DEFAULT_HOP_LIMIT - currentDepth),
        routePeerIds: [...current.pathPeerIds],
      };

      this.eventRecorder.save(current.peer.id, SimulationEventType.SystemMessageBroadcast, {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit: current.peer.id !== this.routingPeer.id,
        message: cloneDsrMessage(requestMessage),
        note:
          current.peer.id === this.routingPeer.id
            ? `DSR Route Request ${requestId} flooded for destination ${destinationPeerId}.`
            : `Forwarded DSR Route Request ${requestId}.`,
      });

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
      const senderPeer = senderModule?.routingPeer;
      if (!senderPeer) {
        continue;
      }

      const replyMessage: DsrRouteReplyMessage = {
        kind: SimulationMessageKind.DsrRouteReplyMessage,
        sourcePeerId: pathPeerIds[0],
        senderPeerId,
        targetPeerId: pathPeerIds[pathPeerIds.length - 1],
        requestId,
        hopLimit: index,
        routePeerIds: [...pathPeerIds],
      };

      this.eventRecorder.save(senderPeerId, SimulationEventType.SystemThroughputCalculated, {
        message: cloneDsrMessage(replyMessage),
        reason: `DSR Route Reply ${requestId} unicast to ${previousPeerId} carrying source route ${pathPeerIds.join(" -> ")}.`,
      });
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
        kind: SimulationMessageKind.DsrRouteReplyMessage,
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
    packet: SimulationPacket,
    routePeerIds: UUID[],
    salvageCount: number,
  ): boolean {
    if (routePeerIds.length < 2) {
      return packet.destinationPeerId === this.routingPeer.id;
    }

    let currentPeer = this.routingPeer;
    let currentPacket = { ...packet };

    for (let index = 0; index < routePeerIds.length - 1; index += 1) {
      const currentPeerId = routePeerIds[index];
      const nextPeerId = routePeerIds[index + 1];

      if (currentPeer.id !== currentPeerId) {
        const alignedPeer = currentPeer.getNeighbour(currentPeerId);
        if (!alignedPeer) {
          return false;
        }
        currentPeer = alignedPeer;
      }

      if (currentPacket.timeToLive <= 0) {
        this.eventRecorder.save(currentPeer.id, SimulationEventType.SystemMessageDropped, {
          message: cloneDsrMessage(currentPacket),
          reason: "Packet TTL reached zero",
        });
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

      this.eventRecorder.save(currentPeer.id, SimulationEventType.SystemRouteSelected, {
        protocol: RoutingProtocol.DSR,
        destinationPeerId: packet.destinationPeerId,
        selectedRoute,
        message: cloneDsrMessage(currentPacket),
      });

      const nextPeer = currentPeer.getNeighbour(nextPeerId);
      if (!nextPeer || !nextPeer.supports(RoutingProtocol.DSR)) {
        const routeError = this.createRouteError(packet, currentPeerId, nextPeerId, salvageCount);
        this.eventRecorder.save(currentPeer.id, SimulationEventType.SystemMessageDropped, {
          message: cloneDsrMessage(routeError),
          reason: "Selected next hop does not support DSR",
        });

        this.invalidateRoutesAcrossPath(routePeerIds, currentPeerId, nextPeerId, routeError);

        if (salvageCount < DSR_MAX_SALVAGE_COUNT) {
          const salvageRoute = this.getUsableRoute(packet.destinationPeerId, {
            excludedLink: [currentPeerId, nextPeerId],
          });
          if (salvageRoute) {
            const prefix = routePeerIds.slice(0, index + 1);
            const salvagedPath = [...prefix, ...salvageRoute.pathPeerIds.slice(1)];
            this.eventRecorder.save(
              currentPeer.id,
              SimulationEventType.SystemThroughputCalculated,
              {
                message: cloneDsrMessage(routeError),
                reason: `DSR packet salvaging reused cached alternate route ${salvagedPath.join(" -> ")}.`,
              },
            );

            return this.forwardPacketOnRoute(currentPacket, salvagedPath, salvageCount + 1);
          }
        }

        return false;
      }

      currentPacket = {
        ...currentPacket,
        sourcePeerId: currentPacket.sourcePeerId ?? routePeerIds[0],
        timeToLive: currentPacket.timeToLive - 1,
      };
      currentPeer = nextPeer;
    }

    return currentPeer.id === packet.destinationPeerId;
  }

  private getUsableRoute(
    destinationPeerId: UUID,
    options?: { excludedLink?: [UUID, UUID] },
  ): RouteCacheEntry | null {
    const route = this.routeCache.get(destinationPeerId) ?? null;
    if (!route) {
      return null;
    }

    if (route.pathPeerIds.length < 2 || route.pathPeerIds[0] !== this.routingPeer.id) {
      return null;
    }

    if (options?.excludedLink) {
      const [blockedFromPeerId, blockedToPeerId] = options.excludedLink;
      for (let index = 0; index < route.pathPeerIds.length - 1; index += 1) {
        if (
          route.pathPeerIds[index] === blockedFromPeerId &&
          route.pathPeerIds[index + 1] === blockedToPeerId
        ) {
          return null;
        }
      }
    }

    return route;
  }

  private upsertRoute(
    destinationPeerId: UUID,
    pathPeerIds: UUID[],
    message: DsrRouteRequestMessage | DsrRouteReplyMessage,
    reason: string,
  ) {
    if (pathPeerIds.length < 2 || pathPeerIds[0] !== this.routingPeer.id) {
      return;
    }

    const currentTick = this.eventRecorder.getCurrentTick();
    const nextRoute: RouteCacheEntry = {
      destinationPeerId,
      nextHopPeerId: pathPeerIds[1],
      metric: pathPeerIds.length - 1,
      sequenceNumber: message.requestId,
      lastUpdateTick: currentTick,
      pathPeerIds: [...pathPeerIds],
    };

    const previousRoute = this.routeCache.get(destinationPeerId) ?? null;
    this.routeCache.set(destinationPeerId, nextRoute);

    if (!previousRoute) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableInsert, {
        protocol: RoutingProtocol.DSR,
        destinationPeerId,
        nextHopPeerId: nextRoute.nextHopPeerId,
        previousRoute: null,
        nextRoute,
        message: cloneDsrMessage(message),
        reason,
      });
      return;
    }

    if (
      previousRoute.nextHopPeerId !== nextRoute.nextHopPeerId ||
      previousRoute.metric !== nextRoute.metric ||
      previousRoute.pathPeerIds.join("|") !== nextRoute.pathPeerIds.join("|")
    ) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableUpdate, {
        protocol: RoutingProtocol.DSR,
        destinationPeerId,
        nextHopPeerId: nextRoute.nextHopPeerId,
        previousRoute,
        nextRoute,
        message: cloneDsrMessage(message),
        reason,
      });
      return;
    }

    this.routeCache.set(destinationPeerId, {
      ...nextRoute,
      sequenceNumber: previousRoute.sequenceNumber,
    });
  }

  private createRouteError(
    packet: SimulationPacket,
    brokenFromPeerId: UUID,
    brokenToPeerId: UUID,
    salvageCount: number,
  ): DsrRouteErrorMessage {
    return {
      kind: SimulationMessageKind.DsrRouteErrorMessage,
      sourcePeerId: packet.sourcePeerId ?? this.routingPeer.id,
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
    for (const [destinationPeerId, route] of this.routeCache.entries()) {
      const usesBrokenLink = route.pathPeerIds.some(
        (peerId, index) =>
          index < route.pathPeerIds.length - 1 &&
          peerId === brokenFromPeerId &&
          route.pathPeerIds[index + 1] === brokenToPeerId,
      );

      if (!usesBrokenLink) {
        continue;
      }

      this.routeCache.delete(destinationPeerId);
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.RoutingTableRemove, {
        protocol: RoutingProtocol.DSR,
        destinationPeerId,
        nextHopPeerId: route.nextHopPeerId,
        previousRoute: route,
        nextRoute: null,
        message: cloneDsrMessage(message),
        reason: `DSR Route Error invalidated cache entry using broken link ${brokenFromPeerId} -> ${brokenToPeerId}.`,
      });
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
    let currentPeer: SimulationPeerNode | null = this.routingPeer;

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
}
