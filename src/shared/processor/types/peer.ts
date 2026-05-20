import { AodvModule } from "@/shared/processor/aodv/AodvModule";
import { BatmanModule } from "@/shared/processor/batman/BatmanModule";
import type { EventRecorder } from "@/shared/processor/core/EventRecorder";
import {
  RoutingStructure,
  type PeerNode,
  type RoutingModule,
  type RoutingStructuresMap,
} from "@/shared/processor/core/runtimeTypes";
import { DsdvModule } from "@/shared/processor/dsdv/DsdvModule";
import { DsrModule } from "@/shared/processor/dsr/DsrModule";
import { OlsrModule } from "@/shared/processor/olsr/OlsrModule";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { RuntimeNetwork } from "./network";

export class RuntimePeer implements PeerNode {
  private readonly module: RoutingModule | null;
  private readonly rangedPeerIds = new Set<UUID>();
  private readonly linkedPeerIds = new Set<UUID>();
  private readonly entity: PeerEntity;
  private readonly network: RuntimeNetwork;

  constructor(entity: PeerEntity, network: RuntimeNetwork, eventRecorder: EventRecorder) {
    this.entity = entity;
    this.network = network;
    this.module = this.createModule(eventRecorder);
  }

  private createModule(eventRecorder: EventRecorder): RoutingModule | null {
    const protocol = this.entity.protocol;

    if (protocol === RoutingProtocol.BATMAN) {
      return new BatmanModule(this, eventRecorder);
    }

    if (protocol === RoutingProtocol.DSDV) {
      return new DsdvModule(this, eventRecorder);
    }

    if (protocol === RoutingProtocol.AODV) {
      return new AodvModule(this, eventRecorder);
    }

    if (protocol === RoutingProtocol.DSR) {
      return new DsrModule(this, eventRecorder);
    }

    if (protocol === RoutingProtocol.OLSR) {
      return new OlsrModule(this, eventRecorder);
    }

    return null;
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
    return this.module !== null && this.entity.protocol === protocol;
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

  clearTopology() {
    this.rangedPeerIds.clear();
    this.linkedPeerIds.clear();
  }

  addRangedPeer(peerId: UUID) {
    this.rangedPeerIds.add(peerId);
  }

  addLinkedPeer(peerId: UUID) {
    this.linkedPeerIds.add(peerId);
  }

  getNeighbour(peerId: UUID) {
    if (!this.isActive()) {
      return null;
    }

    if (!this.rangedPeerIds.has(peerId) && !this.linkedPeerIds.has(peerId)) {
      return null;
    }

    const neighbour = this.network.getPeer(peerId);
    return neighbour?.isActive() ? neighbour : null;
  }

  getNeighbours() {
    const neighbourIds = new Set([...this.rangedPeerIds, ...this.linkedPeerIds]);
    const neighbours: PeerNode[] = [];

    for (const peerId of neighbourIds) {
      const peer = this.network.getPeer(peerId);
      if (peer?.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  getRangedNeighbours() {
    const neighbours: PeerNode[] = [];

    for (const peerId of this.rangedPeerIds) {
      const peer = this.network.getPeer(peerId);
      if (peer?.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  isRangedNeighbour(peerId: UUID) {
    return this.rangedPeerIds.has(peerId);
  }

  isLinkedNeighbour(peerId: UUID) {
    return this.linkedPeerIds.has(peerId);
  }

  getRoutingStructures(): Readonly<RoutingStructuresMap> {
    const routingStructures: RoutingStructuresMap = {};
    const module = this.module;
    if (!module) {
      return routingStructures;
    }

    if (module instanceof BatmanModule) {
      routingStructures[RoutingStructure.BatmanRoutingTable] = module.getRoutes();
      routingStructures[RoutingStructure.BatmanNeighboursTable] = module.getNeighboursTable();
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
}
