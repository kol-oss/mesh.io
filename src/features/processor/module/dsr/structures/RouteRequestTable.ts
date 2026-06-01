import type { UUID } from "@/shared/types/common/uuid.ts";
import type { DsrRouteRequestTableRecord } from "@/features/processor/types/protocols/dsr.ts";

export class RouteRequestTable {
  private readonly records = new Map<UUID, Map<UUID, number>>();

  put(destinationId: UUID, sourceId: UUID, identification: number): void {
    const destinationRecords = this.records.get(destinationId);
    if (!destinationRecords) {
      const sourceRecords = new Map<UUID, number>();
      sourceRecords.set(sourceId, identification);

      this.records.set(destinationId, sourceRecords);
    } else {
      destinationRecords.set(sourceId, identification);
    }
  }

  has(destinationId: UUID, sourceId: UUID, identification: number): boolean {
    const destinationRecords = this.records.get(destinationId);
    if (!destinationRecords) {
      return false;
    }

    const sourceRecord = destinationRecords.get(sourceId);
    return !!sourceRecord && sourceRecord <= identification;
  }

  removeBySource(sourceId: UUID): void {
    for (const [destinationId, sourceRecords] of this.records.entries()) {
      sourceRecords.delete(sourceId);

      if (sourceRecords.size === 0) {
        this.records.delete(destinationId);
      }
    }
  }

  getAll(): DsrRouteRequestTableRecord[] {
    const result = [];
    for (const [destinationId, source] of this.records.entries()) {
      for (const [sourceId, identification] of source.entries()) {
        result.push({
          destinationId,
          sourceId,
          identification,
        } satisfies DsrRouteRequestTableRecord);
      }
    }

    return result;
  }
}
