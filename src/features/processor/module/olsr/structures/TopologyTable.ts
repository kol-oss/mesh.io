import type { OlsrTopologyRecord } from "@/features/processor/types/protocols/olsr";
import type { UUID } from "@/shared/types/common/uuid";

export class TopologyTable {
  private readonly entriesByKey = new Map<string, OlsrTopologyRecord>();

  private toKey(lastHopPeerId: UUID, destinationPeerId: UUID) {
    return `${lastHopPeerId}:${destinationPeerId}`;
  }

  set(record: OlsrTopologyRecord) {
    this.entriesByKey.set(this.toKey(record.lastHopPeerId, record.destinationPeerId), record);
  }

  delete(key: string) {
    this.entriesByKey.delete(key);
  }

  deleteByLastHopPeerId(lastHopPeerId: UUID) {
    for (const [key, entry] of this.entriesByKey.entries()) {
      if (entry.lastHopPeerId === lastHopPeerId) {
        this.entriesByKey.delete(key);
      }
    }
  }

  entries() {
    return this.entriesByKey.entries();
  }

  values() {
    return this.entriesByKey.values();
  }

  getAll() {
    return [...this.entriesByKey.values()].sort((left, right) =>
      left.destinationPeerId.localeCompare(right.destinationPeerId),
    );
  }
}
