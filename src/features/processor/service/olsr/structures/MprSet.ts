import type { UUID } from "@/shared/types/common/uuid";

export class MprSet {
  private readonly peerIds = new Set<UUID>();

  clear() {
    this.peerIds.clear();
  }

  add(peerId: UUID) {
    this.peerIds.add(peerId);
  }

  delete(peerId: UUID) {
    this.peerIds.delete(peerId);
  }

  has(peerId: UUID) {
    return this.peerIds.has(peerId);
  }

  values() {
    return this.peerIds.values();
  }

  toArray() {
    return [...this.peerIds];
  }
}
