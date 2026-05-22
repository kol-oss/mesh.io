import type { EventRecorder } from "@/features/processor/EventRecorder";
import { AodvModule } from "@/features/processor/service/aodv/AodvModule";
import { BatmanModule } from "@/features/processor/service/batman/BatmanModule";
import { DsdvModule } from "@/features/processor/service/dsdv/DsdvModule";
import { DsrModule } from "@/features/processor/service/dsr/DsrModule";
import { OlsrModule } from "@/features/processor/service/olsr/OlsrModule";
import {
  RoutingStructure,
  type NodeWrapper,
  type RoutingStructuresMap,
} from "@/features/processor/types/node";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { type RoutingModule } from "../types/module";
import { MODULE_FACTORY_BY_PROTOCOL } from "../utils/module";
import type { NetworkManager } from "./NetworkManager";

export class NetworkNode implements NodeWrapper {
  private readonly entity: PeerEntity;
  private readonly network: NetworkManager;
  private readonly module: RoutingModule;

  private readonly ranged = new Set<UUID>();
  private readonly linked = new Set<UUID>();

  constructor(entity: PeerEntity, network: NetworkManager, eventRecorder: EventRecorder) {
    this.entity = entity;
    this.network = network;

    this.module = MODULE_FACTORY_BY_PROTOCOL.get(this.entity.protocol)!(this, eventRecorder);
  }

  get id() {
    return this.entity.id;
  }

  get name() {
    return this.entity.name;
  }

  isActive() {
    return this.entity.enabled;
  }

  supports(protocol: RoutingProtocol) {
    return this.entity.protocol === protocol;
  }

  getModule(protocol: RoutingProtocol) {
    if (this.entity.protocol !== protocol) {
      return null;
    }

    return this.module;
  }

  getEntity() {
    return this.entity;
  }

  setPosition(x: number, y: number) {
    this.entity.x = x;
    this.entity.y = y;
  }

  setEnabled(enabled: boolean) {
    this.entity.enabled = enabled;
  }

  clear() {
    this.ranged.clear();
    this.linked.clear();
  }

  addRanged(peerId: UUID) {
    this.ranged.add(peerId);
  }

  addLinked(peerId: UUID) {
    this.linked.add(peerId);
  }

  getNeighbour(peerId: UUID) {
    if (!this.isActive()) {
      return null;
    }

    if (!this.ranged.has(peerId) && !this.linked.has(peerId)) {
      return null;
    }

    const neighbour = this.network.getPeer(peerId);
    return neighbour?.isActive() ? neighbour : null;
  }

  getNeighbours() {
    const neighbourIds = new Set([...this.ranged, ...this.linked]);
    const neighbours: NodeWrapper[] = [];

    for (const peerId of neighbourIds) {
      const peer = this.network.getPeer(peerId);
      if (peer?.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  getRangedNeighbours() {
    const neighbours: NodeWrapper[] = [];

    for (const peerId of this.ranged) {
      const peer = this.network.getPeer(peerId);
      if (peer?.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  isRangedNeighbour(peerId: UUID) {
    return this.ranged.has(peerId);
  }

  isLinkedNeighbour(peerId: UUID) {
    return this.linked.has(peerId);
  }

  getRoutingStructures(): Readonly<RoutingStructuresMap> {
    const routingStructures: RoutingStructuresMap = {};
    const module = this.module;
    if (!module) {
      return routingStructures;
    }

    if (module instanceof BatmanModule) {
      routingStructures[RoutingStructure.BatmanRoutingTable] = module.getOriginatorTable();
      routingStructures[RoutingStructure.BatmanNeighboursTable] = module.getNeighboursList();
      return routingStructures;
    }

    if (module instanceof DsdvModule) {
      routingStructures[RoutingStructure.DsdvRoutingTable] = module.getRoutes();
      return routingStructures;
    }

    if (module instanceof AodvModule) {
      routingStructures[RoutingStructure.AodvRoutingTable] = module.getRoutes();
      return routingStructures;
    }

    if (module instanceof OlsrModule) {
      routingStructures[RoutingStructure.OlsrNeighbourTable] = module.getNeighbourTable();
      routingStructures[RoutingStructure.OlsrTopologyTable] = module.getTopologyTable();
      routingStructures[RoutingStructure.OlsrTwoHopTable] = module.getTwoHopTable();
      routingStructures[RoutingStructure.OlsrSelectorTable] = module.getSelectorTable();
      routingStructures[RoutingStructure.OlsrRoutingTable] = module.getRoutes();
      return routingStructures;
    }

    if (module instanceof DsrModule) {
      routingStructures[RoutingStructure.DsrRoutingTable] = module.getRoutes();
    }

    return routingStructures;
  }

  getPrimaryProtocol() {
    return this.entity.protocol;
  }

  getConfiguration() {
    return this.entity.configuration;
  }
}
