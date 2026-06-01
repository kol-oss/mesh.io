import { DEFAULT_TIME_TO_LIVE } from "@/features/processor/constants/message.ts";
import type { EventRecorder } from "@/features/processor/EventRecorder";
import { RouteRequestTable } from "@/features/processor/module/dsr/structures/RouteRequestTable.ts";
import {
  type DsrCalculationEventDetails,
  type DsrPacket,
  type DsrPathRecord,
  type DsrRouteChangeEventDetails,
  type DsrRouteErrorMessage,
  type NewDsrRouteReplyMessage,
  type NewDsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import { DSR_MAX_SALVAGE_COUNT } from "@/shared/constants/protocols/dsr.ts";
import {
  type BroadcastEventDetails,
  type DropEventDetails,
  DropReason,
  EventType,
  type GetRouteEventDetails,
} from "@/shared/types/common/events.ts";
import { type BasePacket, type Message, MessageType } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid";
import type { DsrConfiguration } from "@/shared/types/model/configurations";
import type { NetworkGraph } from "../../network/NetworkGraph";
import { RoutingStructure, type RoutingStructureType } from "../../types/module";
import { BaseModule } from "../BaseModule";
import { RouteCache } from "./structures/NewRouteCache";

// module for DSR protocol
const ROUTING_PROTOCOL = RoutingProtocol.DSR;

export class DsrModule extends BaseModule {
  // routing structures
  private cache!: RouteCache;
  private requestTable!: RouteRequestTable;

  // sequence numbers
  private sequence: number = 0;

  constructor(peerId: UUID, graph: NetworkGraph, eventRecorder: EventRecorder) {
    super(peerId, graph, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(
      MessageType.DsrPacket,
      MessageType.DsrRouteRequestMessage,
      MessageType.DsrRouteReplyMessage,
      MessageType.DsrRouteErrorMessage,
    );
  }

  // initialization of route cache and request table
  override init() {
    const configuration = this.peer.configuration as DsrConfiguration;

    this.cache = new RouteCache(this.peerId, this.eventRecorder, configuration.routeTimeout);
    this.requestTable = new RouteRequestTable();

    this.cache.setTimeoutListener((destinationId: UUID) =>
      this.requestTable.removeBySource(destinationId),
    );
  }

  override process(message: Message): boolean {
    const { type: messageType } = message;

    if (messageType === MessageType.DsrPacket) {
      return this.processDsrPacket(message as DsrPacket);
    }

    if (messageType === MessageType.DsrRouteRequestMessage) {
      return this.processRouteRequest(message as NewDsrRouteRequestMessage);
    }

    if (messageType === MessageType.DsrRouteReplyMessage) {
      return this.processRouteReply(message as NewDsrRouteReplyMessage);
    }

    if (messageType === MessageType.DsrRouteErrorMessage) {
      return this.processRouteError(message as DsrRouteErrorMessage);
    }

    return false;
  }

  private processRouteError(message: DsrRouteErrorMessage) {
    const { errorSourceId, errorDestinationId, destinationId, sourceId, salvageCount } = message;
    this.cache.removeByLink(errorSourceId, errorDestinationId);

    if (this.peerId === sourceId) {
      if (salvageCount > DSR_MAX_SALVAGE_COUNT) {
        return false;
      }

      return this.retryPacketFromSource(sourceId, destinationId, salvageCount);
    }

    const route = this.cache.get(destinationId) || this.cache.getByPrefix(destinationId);
    if (!route) {
      return false;
    }

    const { path } = route;

    const indexInPath = path.indexOf(this.peerId);
    const nextHop = path[indexInPath + 1] || destinationId;

    return super.write(message, nextHop);
  }

  private processDsrPacket(packet: DsrPacket): boolean {
    const { sourcePeerId: sourceId, destinationPeerId: destinationId, path } = packet;
    if (this.peerId == destinationId) {
      return true;
    }

    const pathIndex = path.indexOf(this.peerId);

    const nextHop = path[pathIndex + 1] || destinationId;
    super.recordEvent(
      EventType.GetRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: destinationId,
        selectedRoute: {
          path: [packet.sourcePeerId || this.peerId, ...path, packet.destinationPeerId],
        } satisfies DsrPathRecord,
      } as GetRouteEventDetails,
      ROUTING_PROTOCOL,
    );

    return this.writeWithErrorHandling(
      sourceId!,
      destinationId,
      packet,
      nextHop,
      path,
      packet.salvageCount,
    );
  }

  private writeWithErrorHandling(
    sourceId: UUID,
    destinationId: UUID,
    message: Message,
    nextHop: UUID,
    path: UUID[] = [],
    salvageCount: number = 0,
  ): boolean {
    const isLocalHopReachable = this.canWriteToHop(nextHop);
    const result = super.write(message, nextHop);
    if (message.type !== MessageType.DsrPacket || result) return result;

    if (isLocalHopReachable) {
      return false;
    }

    const newSalvageCount = salvageCount + 1;
    const errorMessage = {
      type: MessageType.DsrRouteErrorMessage,
      sourceId: sourceId!,
      destinationId: destinationId,
      errorSourceId: this.peerId,
      errorDestinationId: nextHop,
      salvageCount: newSalvageCount,
    } satisfies DsrRouteErrorMessage;

    if (sourceId === this.peerId) {
      return this.processRouteError(errorMessage);
    } else {
      this.cache.removeByLink(this.peerId, nextHop);
    }

    const pathIndex = path.indexOf(this.peerId);
    return this.write(errorMessage, path[pathIndex - 1] || sourceId!);
  }

  private canWriteToHop(hopPeerId: UUID): boolean {
    if (!this.peer.active) {
      return false;
    }

    const hop = this.graph.getNeighbours(this.peerId).find((peer) => peer.id === hopPeerId);
    if (!hop || !hop.active) {
      return false;
    }

    return hop.protocol === this.peer.protocol;
  }

  private retryPacketFromSource(
    sourceId: UUID,
    destinationId: UUID,
    salvageCount: number,
  ): boolean {
    const nextHop = this.getRoute(destinationId);
    const route = this.cache.get(destinationId) || this.cache.getByPrefix(destinationId);

    const retryPacket = {
      type: MessageType.DsrPacket,
      sourcePeerId: sourceId,
      destinationPeerId: destinationId,
      timeToLive: DEFAULT_TIME_TO_LIVE,
      path: route?.path ?? [],
      salvageCount,
    } satisfies DsrPacket;

    if (!nextHop || !route) {
      super.recordEvent(
        EventType.Drop,
        {
          message: retryPacket,
          reason: DropReason.NoRoute,
        } satisfies DropEventDetails,
        ROUTING_PROTOCOL,
      );

      return false;
    }

    return this.writeWithErrorHandling(
      sourceId,
      destinationId,
      retryPacket,
      nextHop,
      route.path,
      salvageCount,
    );
  }

  override write(message: Message, hopPeerId: UUID): boolean {
    const { type } = message;

    if (type === MessageType.DsrPacket) {
      return this.processDsrPacket(message as DsrPacket);
    } else if (type === MessageType.Packet) {
      const packet = message as BasePacket;
      const route =
        this.cache.get(packet.destinationPeerId) ||
        this.cache.getByPrefix(packet.destinationPeerId);
      if (!route) {
        return false;
      }

      const wrapped = {
        ...packet,
        type: MessageType.DsrPacket,
        path: route.path,
        salvageCount: 0,
      } satisfies DsrPacket;

      return this.writeWithErrorHandling(
        packet.sourcePeerId!,
        packet.destinationPeerId,
        wrapped,
        hopPeerId,
        route.path,
        0,
      );
    }

    return super.write(message, hopPeerId);
  }

  override getTables(): RoutingStructureType {
    const tables: RoutingStructureType = {} as RoutingStructureType;
    tables[RoutingStructure.DsrRoutingCache] = this.cache.getAll();
    tables[RoutingStructure.DsrRouteRequestTable] = this.requestTable.getAll();

    return tables;
  }

  override processRefresh() {
    // this protocol is reactive, so no refresh processing is needed
  }

  override processTick() {
    this.cache.tick();
  }

  override getRoute(destinationId: UUID): UUID | null {
    const cachedRoute = this.cache.get(destinationId);
    if (cachedRoute) {
      const { path } = cachedRoute;
      super.recordEvent(
        EventType.GetRoute,
        {
          protocol: ROUTING_PROTOCOL,
          destinationPeerId: destinationId,
          selectedRoute: {
            path: [this.peerId, ...path, destinationId],
          } satisfies DsrPathRecord,
        } as GetRouteEventDetails,
        ROUTING_PROTOCOL,
      );

      return cachedRoute.path[0] || destinationId;
    } else {
      const prefixRoute = this.cache.getByPrefix(destinationId);
      if (prefixRoute) {
        const { path } = prefixRoute;
        super.recordEvent(
          EventType.GetRoute,
          {
            protocol: ROUTING_PROTOCOL,
            destinationPeerId: destinationId,
            selectedRoute: {
              path: [this.peerId, ...path, destinationId],
            } satisfies DsrPathRecord,
          } as GetRouteEventDetails,
          ROUTING_PROTOCOL,
        );

        return prefixRoute.path[0] || destinationId;
      }

      const request = {
        type: MessageType.DsrRouteRequestMessage,
        identification: this.sequence,
        sourceId: this.peerId,
        destinationId,
        path: [],
      } satisfies NewDsrRouteRequestMessage;
      this.sequence++;

      super.broadcast(request);
    }

    const route = this.cache.get(destinationId);
    if (!route) {
      return null;
    }

    const { path } = route;
    super.recordEvent(
      EventType.GetRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: destinationId,
        selectedRoute: {
          path: [this.peerId, ...path, destinationId],
        } satisfies DsrPathRecord,
      } as GetRouteEventDetails,
      ROUTING_PROTOCOL,
    );

    return route.path[0] || destinationId;
  }

  private processRouteRequest(message: NewDsrRouteRequestMessage): boolean {
    const { destinationId, sourceId, path, identification } = message;

    // same identification already present - this message is duplicate
    if (this.requestTable.has(destinationId, sourceId, identification)) {
      super.recordEvent(EventType.Drop, {
        reason: DropReason.Duplicate,
        message,
      } satisfies DropEventDetails);

      return true;
    }

    // storing identification
    this.requestTable.put(destinationId, sourceId, identification);

    // the message returned to the sender
    if (this.peerId === sourceId) {
      super.recordEvent(EventType.Drop, {
        reason: DropReason.SourceIsTarget,
        message,
      } satisfies DropEventDetails);

      return true;
    }

    // the message goes by cycle to the node th
    if (path.includes(this.peerId)) {
      super.recordEvent(EventType.Drop, {
        reason: DropReason.Duplicate,
        message,
      } satisfies DropEventDetails);

      return true;
    }

    // the node is the destination
    if (this.peerId === destinationId) {
      const reversed = [...path].reverse();

      const reply: NewDsrRouteReplyMessage = {
        type: MessageType.DsrRouteReplyMessage,
        identification: message.identification,
        sourceId: this.peerId,
        destinationId: message.sourceId,
        path: reversed,
      };

      super.recordEvent(
        EventType.Calculation,
        {
          isFromCache: false,
          sourceId,
          destinationId,
          receivedPath: [sourceId, ...path, destinationId],
          reversedPath: [destinationId, ...reversed, sourceId],
        } satisfies DsrCalculationEventDetails,
        ROUTING_PROTOCOL,
      );

      this.cacheSourcePath(sourceId, identification, [...reversed, destinationId]);

      super.recordEvent(
        EventType.Broadcast,
        {
          neighbourPeerIds: [reversed[0]],
          retransmit: false,
          message: reply,
        } satisfies BroadcastEventDetails,
        ROUTING_PROTOCOL,
      );

      return super.write(reply, reversed[0] || sourceId);
    }

    // node knows the way to the destination
    const cachedRoute = this.cache.get(destinationId);
    if (cachedRoute) {
      const fullPath = [...path, this.peerId, ...cachedRoute.path];
      const reversed = fullPath.reverse();

      const reply: NewDsrRouteReplyMessage = {
        type: MessageType.DsrRouteReplyMessage,
        identification: message.identification,
        sourceId: message.destinationId,
        destinationId: message.sourceId,
        path: reversed,
      };

      super.recordEvent(
        EventType.Calculation,
        {
          isFromCache: true,
          sourceId,
          destinationId,
          receivedPath: [sourceId, ...path, destinationId],
          reversedPath: [sourceId, ...reversed, destinationId],
        } satisfies DsrCalculationEventDetails,
        ROUTING_PROTOCOL,
      );

      let nextHop = reversed[0] || sourceId;
      if (nextHop === this.peerId) {
        nextHop = sourceId;
      }

      super.recordEvent(
        EventType.Broadcast,
        {
          neighbourPeerIds: [nextHop],
          retransmit: false,
          message: reply,
        } satisfies BroadcastEventDetails,
        ROUTING_PROTOCOL,
      );

      return super.write(reply, nextHop);
    }

    // node discovering the route for the destination
    const updatedPath = [...path, this.peerId];
    const request = {
      ...message,
      path: updatedPath,
    } satisfies NewDsrRouteRequestMessage;

    this.cacheSourcePath(sourceId, identification, path.reverse());
    return super.broadcast(request);
  }

  private processRouteReply(message: NewDsrRouteReplyMessage): boolean {
    const { destinationId, sourceId, path, identification } = message;

    if (this.peerId === sourceId) {
      super.recordEvent(EventType.Drop, {
        reason: DropReason.SourceIsTarget,
        message,
      } satisfies DropEventDetails);
      return true;
    }

    if (!path.includes(this.peerId) && this.peerId !== destinationId) {
      return true;
    }

    if (this.peerId === destinationId) {
      const reversed = path.reverse();
      const record = this.cache.insert(sourceId, reversed);

      super.recordEvent(
        EventType.AddRoute,
        {
          protocol: ROUTING_PROTOCOL,
          destinationId: sourceId,
          identification,
          path: [this.peerId, ...record.path, sourceId],
          isSourceCaching: false,
          lastUpdateTick: this.eventRecorder.getCurrentTick(),
        } satisfies DsrRouteChangeEventDetails,
        ROUTING_PROTOCOL,
      );

      return true;
    }

    const indexInPath = path.indexOf(this.peerId);
    const nextHop = path[indexInPath + 1] || destinationId;

    this.cacheSourcePath(sourceId, identification, path);

    super.recordEvent(
      EventType.Broadcast,
      {
        neighbourPeerIds: [nextHop],
        retransmit: false,
        message: message,
      } satisfies BroadcastEventDetails,
      ROUTING_PROTOCOL,
    );

    return super.write(message, nextHop);
  }

  private cacheSourcePath(sourceId: UUID, identification: number, path: UUID[]) {
    const indexInPath = path.indexOf(this.peerId);
    const index = indexInPath === -1 ? path.length : indexInPath;

    const route = this.cache.get(sourceId);

    let isPathCached = !!route;
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i] !== route?.path[i]) {
        isPathCached = false;
        break;
      }
    }

    if (!isPathCached) {
      const sourcePath = path.slice(0, index);
      this.cache.insert(sourceId, sourcePath);

      super.recordEvent(
        EventType.AddRoute,
        {
          protocol: ROUTING_PROTOCOL,
          destinationId: sourceId,
          path: [this.peerId, ...sourcePath, sourceId],
          identification,
          isSourceCaching: true,
          lastUpdateTick: this.eventRecorder.getCurrentTick(),
        } satisfies DsrRouteChangeEventDetails,
        ROUTING_PROTOCOL,
      );
    }
  }
}
