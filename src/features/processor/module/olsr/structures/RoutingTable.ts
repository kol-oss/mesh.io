import type { OlsrRouteRecord } from "@/features/processor/types/protocols/olsr";
import type { UUID } from "@/shared/types/common/uuid";

export class RoutingTable {
  private readonly routes = new Map<UUID, OlsrRouteRecord>();

  get(destinationPeerId: UUID) {
    return this.routes.get(destinationPeerId) ?? null;
  }

  set(route: OlsrRouteRecord) {
    this.routes.set(route.destinationPeerId, route);
  }

  entries() {
    return this.routes.entries();
  }

  clear() {
    this.routes.clear();
  }

  replaceWith(routes: Map<UUID, OlsrRouteRecord>) {
    this.routes.clear();
    for (const route of routes.values()) {
      this.set(route);
    }
  }

  getAll() {
    return [...this.routes.values()].sort((left, right) =>
      left.destinationPeerId.localeCompare(right.destinationPeerId),
    );
  }
}
