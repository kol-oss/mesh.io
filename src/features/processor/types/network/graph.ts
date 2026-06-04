import type { PeerSnapshot, Snapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { LinkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { LinkType } from "./link";
import type { Peer } from "./peer";
import type { ToggleStatusResult } from "./step";

export interface NetworkGraph {
  getNode(peerId: UUID): Peer;
  getNeighbours(peerId: UUID, type?: LinkType): Peer[];
  hasLink(sourceId: UUID, destinationId: UUID, type?: LinkType): boolean;
  init(peers: PeerEntity[], obstacles: ObstacleEntity[], links: LinkEntity[]): void;
  moveNode(nodeId: UUID, x: number, y: number): void;
  setStatus(entityId: UUID, active: boolean): ToggleStatusResult;
  snapshot(tick: number): Snapshot;
  peerTables(): PeerSnapshot[];
}
