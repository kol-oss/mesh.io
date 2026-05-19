import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
import type {
  AodvRouteRecord,
  BatmanNeighbourRecord,
  BatmanRouteRecord,
  DsdvRouteRecord,
  DsrRouteRecord,
  OlsrNeighbourRecord,
  OlsrRouteRecord,
  OlsrSelectorRecord,
  OlsrTopologyRecord,
  OlsrTwoHopRecord,
  Packet,
  Snapshot,
} from "@/shared/types/model/simulation";

export interface RoutingModule {
  read(message: unknown): boolean;
  send(packet: Packet): boolean;
  refresh(): void;
  tick(): void;
}

export interface PeerNode {
  readonly id: UUID;
  readonly name: string;
  isActive(): boolean;
  supports(protocol: RoutingProtocol): boolean;
  getModule(protocol: RoutingProtocol): RoutingModule | null;
  getNeighbour(peerId: UUID): PeerNode | null;
  getNeighbours(): PeerNode[];
  getRangedNeighbours(): PeerNode[];
  isLinkedNeighbour(peerId: UUID): boolean;
  isRangedNeighbour(peerId: UUID): boolean;
  getEntity(): PeerEntity;
}

export interface SnapshotCapablePeerNode extends PeerNode {
  getBatmanRoutingTable(): BatmanRouteRecord[];
  getBatmanNeighboursTable(): BatmanNeighbourRecord[];
  getDsdvRoutingTable(): DsdvRouteRecord[];
  getAodvRoutingTable(): AodvRouteRecord[];
  getDsrRoutingTable(): DsrRouteRecord[];
  getOlsrNeighbourTable(): OlsrNeighbourRecord[];
  getOlsrTwoHopTable(): OlsrTwoHopRecord[];
  getOlsrSelectorTable(): OlsrSelectorRecord[];
  getOlsrTopologyTable(): OlsrTopologyRecord[];
  getOlsrRoutingTable(): OlsrRouteRecord[];
}

export interface Network {
  getPeer(peerId: UUID): SnapshotCapablePeerNode | null;
  getPeers(): SnapshotCapablePeerNode[];
  refreshConnectivity(): void;
  tickModules(): void;
  snapshot(tick: number): Snapshot;
  exportEntities(): NetworkEntity[];
}
