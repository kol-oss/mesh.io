import type { EventRecorder } from "@/features/processor/EventRecorder";
import { type NodeWrapper } from "@/features/processor/types/node";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { type RoutingModule, type RoutingStructureType } from "../types/routing";
import { getStructuresByProtocol, MODULE_FACTORY_BY_PROTOCOL } from "../utils/module";
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

  getEntity() {
    return this.entity;
  }

  getProtocol() {
    return this.entity.protocol;
  }

  getConfiguration() {
    return this.entity.configuration;
  }

  isActive() {
    return this.entity.enabled;
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

  supports(protocol: RoutingProtocol) {
    return this.entity.protocol === protocol;
  }

  getModule(protocol: RoutingProtocol) {
    if (this.entity.protocol !== protocol) {
      return null;
    }

    return this.module;
  }

  getRoutingStructures(): RoutingStructureType {
    const { module, entity } = this;
    const { protocol } = entity;

    return getStructuresByProtocol(protocol, module);
  }
}
