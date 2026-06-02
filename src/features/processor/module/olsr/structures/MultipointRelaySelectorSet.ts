import type { OlsrSelectorRecord } from "@/features/processor/types/protocols/olsr";
import type { UUID } from "@/shared/types/common/uuid";

export class MultipointRelaySelectorSet {
  private readonly selectors = new Map<UUID, number>();

  get size() {
    return this.selectors.size;
  }

  add(selectorPeerId: UUID, lastUpdateTick: number) {
    this.selectors.set(selectorPeerId, lastUpdateTick);
  }

  delete(selectorPeerId: UUID) {
    this.selectors.delete(selectorPeerId);
  }

  values() {
    return this.selectors.keys();
  }

  getAll() {
    return [...this.selectors.entries()]
      .map(
        ([selectorPeerId, lastUpdateTick]): OlsrSelectorRecord => ({
          selectorPeerId,
          lastUpdateTick,
        }),
      )
      .sort((left, right) => left.selectorPeerId.localeCompare(right.selectorPeerId));
  }
}
