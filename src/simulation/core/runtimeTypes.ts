import type { RoutingProtocol } from "../../types/enums";
import type {
  BatmanNeighbourRecord,
  BatmanRouteRecord,
  DsrRouteRecord,
  DsdvRouteRecord,
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
  SimulationPacket,
  SimulationTickSnapshot,
} from "../../types/simulation";
import type { NetworkEntity, PeerEntity } from "../../types/entities";
import type { UUID } from "../../types/uuid";

export interface RoutingProtocolModule {
  read(message: unknown): boolean;
  refresh(): void;
  tick(): void;
}

export interface SimulationPeerNode {
  readonly id: UUID;
  readonly name: string;
  isActive(): boolean;
  supports(protocol: RoutingProtocol): boolean;
  getModule(protocol: RoutingProtocol): RoutingProtocolModule | null;
  getNeighbour(peerId: UUID): SimulationPeerNode | null;
  getNeighbours(): SimulationPeerNode[];
  getRangedNeighbours(): SimulationPeerNode[];
  isLinkedNeighbour(peerId: UUID): boolean;
  isRangedNeighbour(peerId: UUID): boolean;
  getPeerEntity(): PeerEntity;
}

export interface PacketCapableModule extends RoutingProtocolModule {
  send(packet: SimulationPacket): boolean;
}

export interface SnapshotCapablePeerNode extends SimulationPeerNode {
  getBatmanRoutingTable(): BatmanRouteRecord[];
  getBatmanNeighboursTable(): BatmanNeighbourRecord[];
  getDsdvRoutingTable(): DsdvRouteRecord[];
  getDsrRoutingTable(): DsrRouteRecord[];
  getOlsrNeighbourTable(): OlsrNeighbourRecord[];
  getOlsrTwoHopTable(): OlsrTwoHopRecord[];
  getOlsrSelectorTable(): OlsrSelectorRecord[];
  getOlsrTopologyTable(): OlsrTopologyRecord[];
  getOlsrRoutingTable(): OlsrRouteRecord[];
}

export interface SimulationNetworkRuntime {
  getPeer(peerId: UUID): SnapshotCapablePeerNode | null;
  getPeers(): SnapshotCapablePeerNode[];
  refreshConnectivity(): void;
  tickModules(): void;
  snapshot(tick: number): SimulationTickSnapshot;
  exportEntities(): NetworkEntity[];
}
