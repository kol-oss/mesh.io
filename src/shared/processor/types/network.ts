import {
  canCreateRangedConnection,
  getConnectivityObstacleBounds,
  shouldCreateLinkedConnection,
} from "@/shared/processor/connectivity";
import type { EventRecorder } from "@/shared/processor/core/EventRecorder";
import type { Network } from "@/shared/processor/core/runtimeTypes";
import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity, ObstacleEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type { Snapshot } from "@/shared/types/model/simulation";
import type { RuntimeLink } from "./link";
import { RuntimePeer } from "./peer";

const cloneEntity = <T extends NetworkEntity>(entity: T): T => ({ ...entity });

export class RuntimeNetwork implements Network {
  private readonly peers = new Map<UUID, RuntimePeer>();

  private readonly links = new Map<UUID, RuntimeLink>();

  private readonly entityOrder: Array<{ type: NetworkEntity["type"]; id: UUID }> = [];

  private readonly obstacles: ObstacleEntity[] = [];

  constructor(entities: NetworkEntity[], eventRecorder: EventRecorder) {
    for (const entity of entities) {
      this.entityOrder.push({ type: entity.type, id: entity.id });

      if (entity.type === EntityType.Peer) {
        const peerEntity = cloneEntity(entity);
        this.peers.set(peerEntity.id, new RuntimePeer(peerEntity, this, eventRecorder));
        continue;
      }

      if (entity.type === EntityType.Link) {
        this.links.set(entity.id, cloneEntity(entity));
        continue;
      }

      if (entity.type === EntityType.Obstacle) {
        this.obstacles.push(cloneEntity(entity));
      }
    }

    this.refreshConnectivity();
  }

  getPeer(peerId: UUID) {
    return this.peers.get(peerId) ?? null;
  }

  getPeers() {
    return [...this.peers.values()];
  }

  refreshConnectivity() {
    const peerList = this.getPeers();
    const obstacleBounds = getConnectivityObstacleBounds(this.obstacles);

    for (const peer of peerList) {
      peer.clearTopology();
    }

    for (let index = 0; index < peerList.length; index += 1) {
      const source = peerList[index];
      const sourcePeer = source.getEntity();

      for (let innerIndex = index + 1; innerIndex < peerList.length; innerIndex += 1) {
        const destination = peerList[innerIndex];
        const destinationPeer = destination.getEntity();
        if (canCreateRangedConnection(sourcePeer, destinationPeer, obstacleBounds)) {
          source.addRangedPeer(destination.id);
          destination.addRangedPeer(source.id);
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

      source.addLinkedPeer(destination.id);
      destination.addLinkedPeer(source.id);
    }
  }

  tickModules() {
    for (const peer of this.getPeers()) {
      const protocol = peer.getEntity().protocol;
      peer.getModule(protocol)?.tick();
    }
  }

  updatePeerPosition(peerId: UUID, x: number, y: number) {
    this.peers.get(peerId)?.setPosition(x, y);
  }

  toggleEntity(entityId: UUID): {
    entityType: NetworkEntity["type"];
    previousEnabled: boolean;
    nextEnabled: boolean;
  } | null {
    const peer = this.peers.get(entityId);
    if (peer) {
      const previousEnabled = peer.getEntity().enabled;
      const nextEnabled = !previousEnabled;
      peer.setEnabled(nextEnabled);
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

  exportEntities() {
    const peerEntities = new Map<UUID, NetworkEntity>();
    for (const peer of this.getPeers()) {
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
      entities: this.exportEntities(),
      peers: this.getPeers().map((peer) => ({
        ...peer.getEntity(),
        batmanRoutingTable: peer.getBatmanRoutingTable(),
        batmanNeighboursTable: peer.getBatmanNeighboursTable(),
        dsdvRoutingTable: peer.getDsdvRoutingTable(),
        aodvRoutingTable: peer.getAodvRoutingTable(),
        dsrRoutingTable: peer.getDsrRoutingTable(),
        olsrNeighbourTable: peer.getOlsrNeighbourTable(),
        olsrTwoHopTable: peer.getOlsrTwoHopTable(),
        olsrSelectorTable: peer.getOlsrSelectorTable(),
        olsrTopologyTable: peer.getOlsrTopologyTable(),
        olsrRoutingTable: peer.getOlsrRoutingTable(),
      })),
    };
  }
}
