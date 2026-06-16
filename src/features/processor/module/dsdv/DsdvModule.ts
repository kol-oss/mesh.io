import {
  DsdvUpdateType,
  type DsdvRouteRecord,
  type DsdvRouteUpdateMessage,
} from "@/features/processor/types/protocols/dsdv";
import type { EventRecorder } from "@/features/processor/types/recorder";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { DsdvConfiguration } from "@/shared/types/model/configurations";
import { RefreshAction } from "@/shared/types/model/steps";
import { RoutingStructure, type RoutingStructureType } from "../../types/module";
import type { NetworkGraph } from "../../types/network/graph";
import { clone } from "../../utils/clone";
import { toMessageRecord } from "../../utils/protocol/dsdv";
import { BaseModule } from "../BaseModule";
import { DsdvRoutingTable } from "./structures/DsdvRoutingTable";

// module for DSDV protocol
const PROTOCOL = RoutingProtocol.DSDV;

export class DsdvModule extends BaseModule {
  // routing structures
  private routingTable!: DsdvRoutingTable;

  // sequence numbers
  private sequence: number = 0;

  constructor(peerId: UUID, graph: NetworkGraph, eventRecorder: EventRecorder) {
    super(peerId, graph, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(MessageType.DsdvRouteUpdateMessage);
  }

  // initialization of routing table
  override init() {
    const configuration = this.peer.configuration as DsdvConfiguration;

    this.routingTable = new DsdvRoutingTable(
      this.peerId,
      this.eventRecorder,
      configuration.routeTimeout,
    );
  }

  override process(message: Message): boolean {
    const { type: messageType } = message;

    // Route Update (Full Dump / Incremental Update) message
    if (messageType === MessageType.DsdvRouteUpdateMessage) {
      return this.processRouteUpdate(message);
    }

    return false;
  }

  private processRouteUpdate(message: DsdvRouteUpdateMessage) {
    const { sourcePeerId: sourceId } = message;
    if (sourceId === this.peerId) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.SourceIsTarget,
      });

      return false;
    }

    this.routingTable.process(message);
    return true;
  }

  override getRoute(destinationId: UUID): UUID | null {
    const route = this.routingTable.getBestRoute(destinationId);

    if (route) {
      this.recordEvent(
        EventType.GetRoute,
        {
          protocol: PROTOCOL,
          destinationPeerId: destinationId,
          selectedRoute: clone(route),
        } as GetRouteEventDetails,
        PROTOCOL,
      );
    }

    return route?.nextHopPeerId ?? null;
  }

  override processTick() {
    this.routingTable.tick();
  }

  override processRefresh(action: RefreshAction) {
    if (action === RefreshAction.DsdvFullDump) {
      this.processDumpRefresh();
    } else if (action === RefreshAction.DsdvIncremental) {
      this.processIncrementalRefresh();
    }
  }

  private processDumpRefresh(): void {
    const selfRouteExists = this.routingTable.contains(this.peerId);
    if (!selfRouteExists) {
      this.routingTable.insert(this.peerId, this.peerId, 0, this.sequence);
    } else {
      this.sequence += 2;
      this.routingTable.update(this.peerId, this.peerId, 0, this.sequence);
    }

    const routes = this.routingTable.getRoutes();
    this.broadcastRoutes(routes, DsdvUpdateType.FullDump);
  }

  private processIncrementalRefresh() {
    const changes = this.routingTable.getPendingRoutes();
    if (changes.length === 0) {
      super.recordEvent(
        EventType.Drop,
        {
          reason: DropReason.Skip,
        },
        PROTOCOL,
      );

      return;
    }

    this.routingTable.clearPendingRoutes();
    this.broadcastRoutes(changes, DsdvUpdateType.Incremental);
  }

  private broadcastRoutes(routes: DsdvRouteRecord[], type: DsdvUpdateType): void {
    const message: Message = {
      type: MessageType.DsdvRouteUpdateMessage,
      updateType: type,
      sourcePeerId: this.peerId,
      senderPeerId: this.peerId,
      hopCount: 0,
      entries: routes.map(toMessageRecord),
    } satisfies DsdvRouteUpdateMessage;

    super.broadcast(message);
  }

  override getTables() {
    const tables: RoutingStructureType = {} as RoutingStructureType;
    tables[RoutingStructure.DsdvRoutingTable] = this.routingTable.getRoutes();

    return tables;
  }
}
