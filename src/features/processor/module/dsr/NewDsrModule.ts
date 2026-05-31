import type { EventRecorder } from "@/features/processor/EventRecorder";
import {
  type NewDsrRouteReplyMessage,
  type NewDsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import { MessageType, type Message } from "@/shared/types/common/messages";
import type { UUID } from "@/shared/types/common/uuid";
import type { DsrConfiguration } from "@/shared/types/model/configurations";
import type { NetworkGraph } from "../../network/NetworkGraph";
import { type RoutingStructureType } from "../../types/module";
import { BaseModule } from "../BaseModule";
import { RouteCache } from "./structures/NewRouteCache";

// module for DSR protocol

export class DsrModule extends BaseModule {
  // routing structures
  private cache!: RouteCache;

  // sequence numbers
  private sequence: number = 0;

  constructor(peerId: UUID, graph: NetworkGraph, eventRecorder: EventRecorder) {
    super(peerId, graph, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(
      MessageType.DsrRouteRequestMessage,
      MessageType.DsrRouteReplyMessage,
      MessageType.DsrRouteErrorMessage,
    );
  }

  // initialization of route cache
  override init() {
    const configuration = this.peer.configuration as DsrConfiguration;

    this.cache = new RouteCache(this.peerId, this.eventRecorder, configuration.routeTimeout);
  }

  override process(message: Message): boolean {
    const { type: messageType } = message;

    if (messageType === MessageType.DsrRouteRequestMessage) {
      return this.processRouteRequest(message as NewDsrRouteRequestMessage);
    }

    return false;
  }

  override getTables(): RoutingStructureType {
    const tables: RoutingStructureType = {} as RoutingStructureType;

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
      return cachedRoute.pathPeerIds[1];
    } else {
      const prefixRoute = this.cache.getByPrefix(destinationId);
      if (prefixRoute) {
        return prefixRoute.pathPeerIds[1];
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

    return this.cache.get(destinationId)?.nextHopPeerId || null;
  }

  private processRouteRequest(message: NewDsrRouteRequestMessage): boolean {
    const { destinationId, sourceId, addresses } = message;

    if (this.peerId === sourceId) {
      // add drop event
      return true;
    }

    if (addresses.includes(this.peerId)) {
      // add drop event
      return true;
    }

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

      // TODO: Add calculation event

      return super.write(reply, reversed[0]);
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

      // TODO: Add calculation event

      return super.write(reply, reversed[0]);
    }

    // node discovering the route for the destination
    const request = {
      ...message,
      addresses: [...message.addresses, this.peerId],
    } satisfies NewDsrRouteRequestMessage;

    return super.broadcast(request);
  }
}
