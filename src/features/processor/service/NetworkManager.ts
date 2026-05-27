import type { EventRecorder } from "@/features/processor/EventRecorder";
import {
  canCreateRangedConnection,
  getConnectivityObstacleBounds,
  shouldCreateLinkedConnection,
} from "@/features/processor/utils/math/connectivity";
import type { Snapshot } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { LinkEntity, NetworkEntity, ObstacleEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import {
  type EntityManager,
  type EventManager,
  type StateManager,
  type ToggleStatusResult,
} from "../types/network";
import { RoutingStructure } from "../types/routing";
import { NetworkNode } from "./NetworkNode";

const clone = <T extends NetworkEntity>(entity: T): T => ({ ...entity });

export class NetworkManager implements EntityManager, EventManager, StateManager {
  private readonly nodes = new Map<UUID, NetworkNode>();
  private readonly links = new Map<UUID, LinkEntity>();
  private readonly obstacles: ObstacleEntity[] = [];

  private readonly entityOrder: Array<{ type: EntityType; id: UUID }> = [];

  constructor(entities: NetworkEntity[], eventRecorder: EventRecorder) {
    for (const entity of entities) {
      this.entityOrder.push({ type: entity.type, id: entity.id });

      if (entity.type === EntityType.Peer) {
        const peerEntity = clone(entity);
        this.nodes.set(peerEntity.id, new NetworkNode(peerEntity, this, eventRecorder));
        continue;
      }

      if (entity.type === EntityType.Link) {
        this.links.set(entity.id, clone(entity));
        continue;
      }

      if (entity.type === EntityType.Obstacle) {
        this.obstacles.push(clone(entity));
      }
    }

    this.refresh();
  }

  // get peer by id
  getPeer(peerId: UUID) {
    return this.nodes.get(peerId) ?? null;
  }

  // get all peers
  getAllPeers() {
    return [...this.nodes.values()];
  }

  // refresh network connectivity
  refresh() {
    const peerList = this.getAllPeers();
    const obstacleBounds = getConnectivityObstacleBounds(this.obstacles);

    for (const peer of peerList) {
      peer.clear();
    }

    for (let index = 0; index < peerList.length; index += 1) {
      const source = peerList[index];
      const sourcePeer = source.getEntity();

      for (let innerIndex = index + 1; innerIndex < peerList.length; innerIndex += 1) {
        const destination = peerList[innerIndex];
        const destinationPeer = destination.getEntity();
        if (canCreateRangedConnection(sourcePeer, destinationPeer, obstacleBounds)) {
          source.addRanged(destination.id);
          destination.addRanged(source.id);
        }
      }
    }

    for (const link of this.links.values()) {
      const source = link.sourcePeerId ? this.getPeer(link.sourcePeerId) : null;
      const destination = link.destinationPeerId ? this.getPeer(link.destinationPeerId) : null;
      const sourcePeer = source?.getEntity() ?? null;
      const destinationPeer = destination?.getEntity() ?? null;
      if (!shouldCreateLinkedConnection(link, sourcePeer, destinationPeer)) {
        continue;
      }
      if (!source || !destination) {
        continue;
      }

      source.addLinked(destination.id);
      destination.addLinked(source.id);
    }
  }

  // update all routing modules
  tick() {
    for (const peer of this.getAllPeers()) {
      const protocol = peer.getEntity().protocol;
      peer.getModule(protocol)?.tick();
    }
  }

  // update peer position
  move(peerId: UUID, x: number, y: number) {
    const entity = this.nodes.get(peerId)?.getEntity();
    if (!entity) return;

    entity.x = x;
    entity.y = y;
  }

  // toggle peer or link enabled status
  toggleStatus(entityId: UUID): ToggleStatusResult | null {
    const peer = this.nodes.get(entityId);
    if (peer) {
      const entity = peer.getEntity();
      const previousEnabled = entity.enabled;
      const nextEnabled = !previousEnabled;

      entity.enabled = nextEnabled;
      return {
        entityType: EntityType.Peer,
        previousEnabled,
        nextEnabled,
      };
    }

    const link = this.links.get(entityId);
    if (link) {
      const previousEnabled = link.enabled;
      const nextEnabled = !previousEnabled;
      link.enabled = nextEnabled;

      return {
        entityType: EntityType.Link,
        previousEnabled,
        nextEnabled,
      };
    }

    return null;
  }

  // export current network state
  export(): NetworkEntity[] {
    const peerEntities = new Map<UUID, NetworkEntity>();
    for (const peer of this.getAllPeers()) {
      peerEntities.set(peer.id, { ...peer.getEntity() });
    }

    const linkEntities = new Map<UUID, NetworkEntity>();
    for (const link of this.links.values()) {
      linkEntities.set(link.id, { ...link });
    }

    const obstacleEntities = new Map<UUID, NetworkEntity>();
    for (const obstacle of this.obstacles) {
      obstacleEntities.set(obstacle.id, { ...obstacle });
    }

    return this.entityOrder
      .map(({ type, id }) => {
        if (type === EntityType.Peer) {
          return peerEntities.get(id) ?? null;
        }

        if (type === EntityType.Link) {
          return linkEntities.get(id) ?? null;
        }

        return obstacleEntities.get(id) ?? null;
      })
      .filter((entity): entity is NetworkEntity => entity !== null);
  }

  snapshot(tick: number): Snapshot {
    return {
      tick,
      entities: this.export(),
      peers: this.getAllPeers().map((peer) => {
        const structures = peer.getRoutingStructures();

        return {
          ...peer.getEntity(),
          batmanRoutingTable: structures[RoutingStructure.BatmanOriginatorTable] ?? [],
          batmanNeighboursTable: structures[RoutingStructure.BatmanNeighboursList] ?? [],
          dsdvRoutingTable: structures[RoutingStructure.DsdvRoutingTable] ?? [],
          aodvRoutingTable: structures[RoutingStructure.AodvRoutingTable] ?? [],
          dsrRoutingTable: structures[RoutingStructure.DsrRoutingTable] ?? [],
          olsrNeighbourTable: structures[RoutingStructure.OlsrNeighbourTable] ?? [],
          olsrTwoHopTable: structures[RoutingStructure.OlsrTwoHopTable] ?? [],
          olsrSelectorTable: structures[RoutingStructure.OlsrSelectorTable] ?? [],
          olsrTopologyTable: structures[RoutingStructure.OlsrTopologyTable] ?? [],
          olsrRoutingTable: structures[RoutingStructure.OlsrRoutingTable] ?? [],
        };
      }),
    };
  }
}
