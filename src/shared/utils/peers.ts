import type { UUID } from "../types/common/uuid";
import type { PeerEntity } from "../types/model/entities";

export const findById = (id: UUID, peers: PeerEntity[]): PeerEntity | null => {
  return peers.find((peer) => peer.id === id) || null;
};

export const getNameById = (id: UUID, peers: PeerEntity[] = []) => {
  return peers ? findById(id, peers)?.name : undefined;
};
