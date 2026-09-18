import type { UUID } from "@/shared/types/common/uuid";

type RouteRequestKey = `${UUID}:${UUID}:${number}`;

type RouteRequestRecord = {
  sourcePeerId: UUID;
  destinationPeerId: UUID;
  requestId: number;
  expiresAtTick: number;
};

export class RouteRequestTable {
  private readonly records = new Map<RouteRequestKey, RouteRequestRecord>();

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
      expiresAtTick: currentTick + Math.max(1, lifetime),
    });
  }

  tick(currentTick: number) {
    for (const [key, request] of this.records.entries()) {
      if (request.expiresAtTick <= currentTick) {
        this.records.delete(key);
      }
    }
  }

  private getKey(sourcePeerId: UUID, destinationPeerId: UUID, requestId: number): RouteRequestKey {
    return `${sourcePeerId}:${destinationPeerId}:${requestId}`;
  }
}
