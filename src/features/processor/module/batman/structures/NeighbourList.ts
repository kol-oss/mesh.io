import type { BatmanNeighbourRecord } from "@/features/processor/types/protocols/batman";
import type { UUID } from "@/shared/types/common/uuid";

export class NeighbourList {
  private readonly neighbours: Map<UUID, BatmanNeighbourRecord> = new Map();

  get(originator: UUID): BatmanNeighbourRecord | null {
    return this.neighbours.get(originator) || null;
  }

  getAll(): BatmanNeighbourRecord[] {
    return [...this.neighbours.values()];
  }

  put(originator: UUID, record: BatmanNeighbourRecord) {
    this.neighbours.set(originator, record);
  }

  delete(originator: UUID) {
    this.neighbours.delete(originator);
  }
}
