import type { OlsrTwoHopRecord } from "@/features/processor/types/protocols/olsr";
import type { UUID } from "@/shared/types/common/uuid";

export class TwoHopTable {
  private readonly entriesByKey = new Map<string, OlsrTwoHopRecord>();

  private toKey(destinationPeerId: UUID, viaPeerId: UUID) {
    return `${destinationPeerId}:${viaPeerId}`;
  }

  set(record: OlsrTwoHopRecord) {
    this.entriesByKey.set(this.toKey(record.destinationPeerId, record.viaPeerId), record);
  }

  delete(key: string) {
    this.entriesByKey.delete(key);
  }

  deleteByViaPeerId(viaPeerId: UUID) {
    for (const [key, entry] of this.entriesByKey.entries()) {
      if (entry.viaPeerId === viaPeerId) {
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
    return [...this.entriesByKey.values()].sort((left, right) => {
      if (left.destinationPeerId !== right.destinationPeerId) {
        return left.destinationPeerId.localeCompare(right.destinationPeerId);
      }

      return left.viaPeerId.localeCompare(right.viaPeerId);
    });
  }
}
