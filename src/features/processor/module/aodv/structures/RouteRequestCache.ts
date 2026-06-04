import type { UUID } from "@/shared/types/common/uuid";

type CacheKey = `${UUID}:${UUID}:${number}`;

type RouteRequestRecord = {
  sourcePeerId: UUID;
  destinationPeerId: UUID;
  requestId: number;
  lastSeenTick: number;
  timeout: number;
};

export class RouteRequestCache {
  private readonly records = new Map<CacheKey, RouteRequestRecord>();

  has(sourcePeerId: UUID, destinationPeerId: UUID, requestId: number) {
    const key = this.getKey(sourcePeerId, destinationPeerId, requestId);
    return this.records.has(key);
  }

  put(
    sourcePeerId: UUID,
    destinationPeerId: UUID,
    requestId: number,
    currentTick: number,
    lifetime: number,
  ) {
    const key = this.getKey(sourcePeerId, destinationPeerId, requestId);
    this.records.set(key, {
      sourcePeerId,
      destinationPeerId,
      requestId,
      lastSeenTick: currentTick,
      timeout: Math.max(1, lifetime),
    });
  }

  tick(currentTick: number) {
    for (const [key, record] of this.records.entries()) {
      if (record.lastSeenTick + record.timeout <= currentTick) {
        this.records.delete(key);
      }
    }
  }

  private getKey(sourcePeerId: UUID, destinationPeerId: UUID, requestId: number): CacheKey {
    return `${sourcePeerId}:${destinationPeerId}:${requestId}`;
  }
}
