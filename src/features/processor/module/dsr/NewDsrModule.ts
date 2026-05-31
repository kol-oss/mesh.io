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
      console.log(this.peer.name + " received RREQ");
      return this.processRouteRequest(message as NewDsrRouteRequestMessage);
    }

    if (messageType === MessageType.DsrRouteReplyMessage) {
      console.log(this.peer.name + " received RREP");
      return this.processRouteReply(message as NewDsrRouteReplyMessage);
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

      console.log(this.peer.name + " broadcasted RREQ");
      super.broadcast(request);
    }

    console.log(this.peer.name + " checked it's cache for route to " + destinationId);
    console.log(this.peer.name + " cache: ", this.cache.getAll());

    return this.cache.get(destinationId)?.pathPeerIds[0] || null;
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
      console.log(this.peer.name + " determined that he is the destination of RREQ");
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
      console.log(this.peer.name + " created RREP", reply);

      console.log(this.peer.name + " sending RREP to ", reversed[0] || sourceId);
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

  private processRouteReply(message: NewDsrRouteReplyMessage): boolean {
    const { destinationId, sourceId, addresses } = message;

    if (this.peerId === sourceId) {
      // TODO: Add drop event
      return true;
    }

    if (!addresses.includes(this.peerId) && this.peerId !== destinationId) {
      return true;
    }

    if (this.peerId === destinationId) {
      this.cache.insert(sourceId, addresses, 1);

      return true;
    }

    const indexInPath = addresses.indexOf(this.peerId);
    const nextHop = addresses[indexInPath + 1] || destinationId;

    const sourcePath = addresses.slice(0, indexInPath - 1);
    this.cache.insert(sourceId, sourcePath, 1);

    const destinationPath = addresses.slice(indexInPath + 1);
    this.cache.insert(destinationId, destinationPath, 1);

    return super.write(message, nextHop);
  }
}
