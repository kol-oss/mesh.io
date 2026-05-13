import type { PeerEntity } from "../../types/entities";
import { RoutingProtocol } from "../../../types/common/protocols";
import type { UUID } from "../../types/uuid";
import { AodvModule } from "../aodv/AodvModule";
import { BatmanModule } from "../batman/BatmanModule";
import type { SimulationEventRecorder } from "../core/EventRecorder";
import type { RoutingProtocolModule, SnapshotCapablePeerNode } from "../core/runtimeTypes";
import { DsdvModule } from "../dsdv/DsdvModule";
import { DsrModule } from "../dsr/DsrModule";
import { OlsrModule } from "../olsr/OlsrModule";
import type { RuntimeNetwork } from "./network";

export class RuntimePeer implements SnapshotCapablePeerNode {
  private readonly modules = new Map<RoutingProtocol, RoutingProtocolModule>();
  private readonly rangedPeerIds = new Set<UUID>();
  private readonly linkedPeerIds = new Set<UUID>();
  private readonly entity: PeerEntity;
  private readonly network: RuntimeNetwork;

  constructor(entity: PeerEntity, network: RuntimeNetwork, eventRecorder: SimulationEventRecorder) {
    this.entity = entity;
    this.network = network;

    if (entity.protocol === RoutingProtocol.BATMAN) {
      this.modules.set(entity.protocol, new BatmanModule(this, eventRecorder));
      return;
    }

    if (entity.protocol === RoutingProtocol.DSDV) {
      this.modules.set(entity.protocol, new DsdvModule(this, eventRecorder));
      return;
    }

    if (entity.protocol === RoutingProtocol.AODV) {
      this.modules.set(entity.protocol, new AodvModule(this, eventRecorder));
      return;
    }

    if (entity.protocol === RoutingProtocol.DSR) {
      this.modules.set(entity.protocol, new DsrModule(this, eventRecorder));
      return;
    }

    if (entity.protocol === RoutingProtocol.OLSR) {
      this.modules.set(entity.protocol, new OlsrModule(this, eventRecorder));
    }
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
    return this.modules.has(protocol);
  }

  getModule(protocol: RoutingProtocol) {
    return this.modules.get(protocol) ?? null;
  }

  getPeerEntity() {
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
    const neighbours: RuntimePeer[] = [];

    for (const peerId of neighbourIds) {
      const peer = this.network.getPeer(peerId);
      if (peer?.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  getRangedNeighbours() {
    const neighbours: RuntimePeer[] = [];

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

  getBatmanRoutingTable() {
    const batmanModule = this.modules.get(RoutingProtocol.BATMAN);
    if (!(batmanModule instanceof BatmanModule)) {
      return [];
    }

    return batmanModule.getRoutes();
  }

  getBatmanNeighboursTable() {
    const batmanModule = this.modules.get(RoutingProtocol.BATMAN);
    if (!(batmanModule instanceof BatmanModule)) {
      return [];
    }

    return batmanModule.getNeighboursTable();
  }

  getDsdvRoutingTable() {
    const dsdvModule = this.modules.get(RoutingProtocol.DSDV);
    if (!(dsdvModule instanceof DsdvModule)) {
      return [];
    }

    return dsdvModule.getRoutes();
  }

  getAodvRoutingTable() {
    const aodvModule = this.modules.get(RoutingProtocol.AODV);
    if (!(aodvModule instanceof AodvModule)) {
      return [];
    }

    return aodvModule.getRoutes();
  }

  getPrimaryProtocol() {
    return this.entity.protocol;
  }

  getOlsrNeighbourTable() {
    const olsrModule = this.modules.get(RoutingProtocol.OLSR);
    if (!(olsrModule instanceof OlsrModule)) {
      return [];
    }

    return olsrModule.getNeighbourTable();
  }

  getOlsrTopologyTable() {
    const olsrModule = this.modules.get(RoutingProtocol.OLSR);
    if (!(olsrModule instanceof OlsrModule)) {
      return [];
    }

    return olsrModule.getTopologyTable();
  }

  getOlsrTwoHopTable() {
    const olsrModule = this.modules.get(RoutingProtocol.OLSR);
    if (!(olsrModule instanceof OlsrModule)) {
      return [];
    }

    return olsrModule.getTwoHopTable();
  }

  getOlsrSelectorTable() {
    const olsrModule = this.modules.get(RoutingProtocol.OLSR);
    if (!(olsrModule instanceof OlsrModule)) {
      return [];
    }

    return olsrModule.getSelectorTable();
  }

  getOlsrRoutingTable() {
    const olsrModule = this.modules.get(RoutingProtocol.OLSR);
    if (!(olsrModule instanceof OlsrModule)) {
      return [];
    }

    return olsrModule.getRoutes();
  }

  getDsrRoutingTable() {
    const dsrModule = this.modules.get(RoutingProtocol.DSR);
    if (!(dsrModule instanceof DsrModule)) {
      return [];
    }

    return dsrModule.getRoutes();
  }
}
