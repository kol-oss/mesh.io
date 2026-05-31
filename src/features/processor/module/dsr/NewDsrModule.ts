import type { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type DsrCalculationEventDetails,
  type DsrPacket,
  type DsrRouteChangeEventDetails,
  type DsrRouteRecord,
  type NewDsrRouteReplyMessage,
  type NewDsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import { type BasePacket, type Message, MessageType } from "@/shared/types/common/messages";
import type { UUID } from "@/shared/types/common/uuid";
import type { DsrConfiguration } from "@/shared/types/model/configurations";
import type { NetworkGraph } from "../../network/NetworkGraph";
import { RoutingStructure, type RoutingStructureType } from "../../types/module";
import { BaseModule } from "../BaseModule";
import { RouteCache } from "./structures/NewRouteCache";
import { RouteRequestTable } from "@/features/processor/module/dsr/structures/RouteRequestTable.ts";
import {
  type BroadcastEventDetails,
  type DropEventDetails,
  DropReason,
  EventType,
  type GetRouteEventDetails,
} from "@/shared/types/common/events.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";

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

    this.cache.setTimeoutListener((destinationId: UUID) => this.requestTable.remove(destinationId));
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

    return false;
  }

  private processDsrPacket(packet: DsrPacket): boolean {
    const { destinationPeerId: destinationId, path } = packet;
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
        selectedRoute: null as unknown as DsrRouteRecord,
      } as GetRouteEventDetails,
      ROUTING_PROTOCOL,
    );

    return super.write(packet, nextHop);
  }

  override send(packet: BasePacket): boolean {
    const { type } = packet;
    if (type === MessageType.DsrPacket) {
      return this.processDsrPacket(packet as DsrPacket);
    } else {
      const wrapped = {
        ...packet,
        type: MessageType.DsrPacket,
        path: [],
      } satisfies DsrPacket;

      return super.send(wrapped);
    }
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
      return cachedRoute.pathPeerIds[0];
    } else {
      const prefixRoute = this.cache.getByPrefix(destinationId);
      if (prefixRoute) {
        return prefixRoute.pathPeerIds[0];
      }

      const request = {
        type: MessageType.DsrRouteRequestMessage,
        identification: this.sequence,
        sourceId: this.peerId,
        destinationId,
        addresses: [],
      } satisfies NewDsrRouteRequestMessage;

      super.broadcast(request);
    }

    super.recordEvent(
      EventType.GetRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: destinationId,
        selectedRoute: null as unknown as DsrRouteRecord,
      } as GetRouteEventDetails,
      ROUTING_PROTOCOL,
    );
    return this.cache.get(destinationId)?.pathPeerIds[0] || null;
  }

  private processRouteRequest(message: NewDsrRouteRequestMessage): boolean {
    const { destinationId, sourceId, addresses, identification } = message;

    // same identification already present - this message is duplicate
    if (this.requestTable.has(destinationId, sourceId, identification)) {
      super.recordEvent(
        EventType.Drop,
        {
          reason: DropReason.Duplicate,
          message,
        } satisfies DropEventDetails,
        ROUTING_PROTOCOL,
      );

      return true;
    }

    // storing identification
    this.requestTable.put(destinationId, sourceId, identification);

    // the message returned to the sender
    if (this.peerId === sourceId) {
      super.recordEvent(
        EventType.Drop,
        {
          reason: DropReason.SourceIsTarget,
          message,
        } satisfies DropEventDetails,
        ROUTING_PROTOCOL,
      );

      return true;
    }

    // the message goes by cycle to the node th
    if (addresses.includes(this.peerId)) {
      super.recordEvent(
        EventType.Drop,
        {
          reason: DropReason.Duplicate,
          message,
        } satisfies DropEventDetails,
        ROUTING_PROTOCOL,
      );

      return true;
    }

    console.log("THIS PEER IS THE DESTINATION");

    // the node is the destination
    if (this.peerId === destinationId) {
      const reversed = [...addresses].reverse();

      const path = [this.peerId, ...reversed];
      const reply: NewDsrRouteReplyMessage = {
        type: MessageType.DsrRouteReplyMessage,
        identification: message.identification,
        sourceId: this.peerId,
        destinationId: message.sourceId,
        addresses: path,
      };

      super.recordEvent(
        EventType.Calculation,
        {
          isFromCache: false,
          sourceId,
          destinationId,
          receivedPath: addresses,
          reversedPath: reversed,
        } satisfies DsrCalculationEventDetails,
        ROUTING_PROTOCOL,
      );

      this.cachePath(sourceId, this.peerId, identification, reversed);

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
      const path = [...addresses, ...cachedRoute.pathPeerIds];
      const reversed = [...path].reverse();

      const reply: NewDsrRouteReplyMessage = {
        type: MessageType.DsrRouteReplyMessage,
        identification: message.identification,
        sourceId: this.peerId,
        destinationId: message.sourceId,
        addresses: path,
      };

      super.recordEvent(
        EventType.Calculation,
        {
          isFromCache: true,
          sourceId,
          destinationId,
          receivedPath: addresses,
          reversedPath: reversed,
        } satisfies DsrCalculationEventDetails,
        ROUTING_PROTOCOL,
      );

      super.recordEvent(
        EventType.Broadcast,
        {
          neighbourPeerIds: [reversed[0]],
          retransmit: false,
          message: reply,
        } satisfies BroadcastEventDetails,
        ROUTING_PROTOCOL,
      );

      return super.write(reply, reversed[0]);
    }

    // node discovering the route for the destination
    const request = {
      ...message,
      addresses: [...message.addresses, this.peerId],
    } satisfies NewDsrRouteRequestMessage;

    this.cachePath(destinationId, this.peerId, identification, message.addresses.reverse());
    return super.broadcast(request);
  }

  private processRouteReply(message: NewDsrRouteReplyMessage): boolean {
    const { destinationId, sourceId, addresses, identification } = message;

    if (this.peerId === sourceId) {
      // TODO: Add drop event
      return true;
    }

    if (!addresses.includes(this.peerId) && this.peerId !== destinationId) {
      return true;
    }

    if (this.peerId === destinationId) {
      const reversed = addresses.reverse();
      const record = this.cache.insert(sourceId, reversed, identification);

      super.recordEvent(
        EventType.AddRoute,
        {
          protocol: ROUTING_PROTOCOL,
          destinationPeerId: sourceId,
          nextHopPeerId: null as unknown as UUID,
          previousRoute: null as unknown as DsrRouteRecord,
          nextRoute: record,
        } satisfies DsrRouteChangeEventDetails,
        ROUTING_PROTOCOL,
      );

      return true;
    }

    const indexInPath = addresses.indexOf(this.peerId);
    const nextHop = addresses[indexInPath + 1] || destinationId;

    this.cachePath(destinationId, sourceId, identification, addresses);

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

  private cachePath(destinationId: UUID, sourceId: UUID, identification: number, path: UUID[]) {
    const indexInPath = path.indexOf(this.peerId);

    const sourcePath = path.slice(0, indexInPath - 1);
    const sourceRecord = this.cache.insert(sourceId, sourcePath, identification);

    super.recordEvent(
      EventType.AddRoute,
      {
        protocol: ROUTING_PROTOCOL,
        destinationPeerId: destinationId,
        nextHopPeerId: null as unknown as UUID,
        previousRoute: null as unknown as DsrRouteRecord,
        nextRoute: sourceRecord,
      } satisfies DsrRouteChangeEventDetails,
      ROUTING_PROTOCOL,
    );

    const destinationPath = path.slice(indexInPath + 1);
    this.cache.insert(destinationId, destinationPath, identification);
  }
}
