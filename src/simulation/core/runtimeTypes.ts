import type { RoutingProtocol } from "../../types/enums";
import type {
  BatmanRouteRecord,
  SimulationPacket,
  SimulationTickSnapshot,
} from "../../types/simulation";
import type { NetworkEntity, PeerEntity } from "../../types/entities";

export interface RoutingProtocolModule {
  read(message: unknown): boolean;
  refresh(): void;
  tick(): void;
}

export interface SimulationPeerNode {
  readonly id: string;
  readonly name: string;
  isActive(): boolean;
  supports(protocol: RoutingProtocol): boolean;
  getModule(protocol: RoutingProtocol): RoutingProtocolModule | null;
  getNeighbour(peerId: string): SimulationPeerNode | null;
  getNeighbours(): SimulationPeerNode[];
  getRangedNeighbours(): SimulationPeerNode[];
  isLinkedNeighbour(peerId: string): boolean;
  isRangedNeighbour(peerId: string): boolean;
  getPeerEntity(): PeerEntity;
}

export interface PacketCapableModule extends RoutingProtocolModule {
  send(packet: SimulationPacket): boolean;
}

export interface SnapshotCapablePeerNode extends SimulationPeerNode {
  getRoutingTable(): BatmanRouteRecord[];
}

export interface SimulationNetworkRuntime {
  getPeer(peerId: string): SnapshotCapablePeerNode | null;
  getPeers(): SnapshotCapablePeerNode[];
  refreshConnectivity(): void;
  tickModules(): void;
  snapshot(tick: number): SimulationTickSnapshot;
  exportEntities(): NetworkEntity[];
}
