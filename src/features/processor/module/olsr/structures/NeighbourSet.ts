import type { OlsrNeighbourRecord } from "@/features/processor/types/protocols/olsr";
import type { UUID } from "@/shared/types/common/uuid";

export class NeighbourSet {
  private readonly neighbours = new Map<UUID, OlsrNeighbourRecord>();

  get(peerId: UUID): OlsrNeighbourRecord | null {
    return this.neighbours.get(peerId) ?? null;
  }

  has(peerId: UUID) {
    return this.neighbours.has(peerId);
  }

  set(record: OlsrNeighbourRecord) {
    this.neighbours.set(record.neighbourPeerId, record);
  }

  delete(peerId: UUID) {
    this.neighbours.delete(peerId);
  }

  entries() {
    return this.neighbours.entries();
  }

  values() {
    return this.neighbours.values();
  }

  getAll() {
    return [...this.neighbours.values()].sort((left, right) =>
      left.neighbourPeerId.localeCompare(right.neighbourPeerId),
    );
  }
}
