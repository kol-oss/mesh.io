import type { Snapshot } from "@/shared/types/common/simulation";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import type { Coordinate } from "@/shared/types/model/base";
import {
  EntityType,
  type LinkEntity,
  type ObstacleEntity,
  type PeerEntity,
} from "@/shared/types/model/entities";
import type { ObstacleBounds } from "@/shared/types/workspace/interaction";
import Graph, { UndirectedGraph } from "graphology";
import type { EventRecorder } from "../EventRecorder";
import type { BaseModule } from "../module/BaseModule";
import { RoutingStructure } from "../types/module";
import { LinkType, type Link } from "../types/network/link";
import type { Peer } from "../types/network/peer";
import type { ToggleStatusResult } from "../types/network/step";
import { canCreateRangedConnection, getObstacleBounds } from "../utils/math/connectivity";
import { createModule } from "../utils/module";

export class NetworkGraph {
  private readonly eventRecorder: EventRecorder;
  private graph: Graph<Peer, Link> = new UndirectedGraph<Peer, Link>();

  private peers!: PeerEntity[];
  private obstacles!: ObstacleEntity[];
  private links!: LinkEntity[];

  constructor(eventRecorder: EventRecorder) {
    this.eventRecorder = eventRecorder;
  }

  // retrieves peer node by id
  getNode(peerId: UUID): Peer {
    const peer = this.graph.getNodeAttributes(peerId);
    if (!peer) {
      throw new Error(`Peer with id ${peerId} not found in the graph`);
    }

    return peer;
  }

  // retrieves neighbour peers for peer id
  getNeighbours(peerId: UUID, type?: LinkType): Peer[] {
    const source = this.graph.getNodeAttributes(peerId);
    if (!source.active) return [];

    const neighbourIds = this.graph.neighbors(peerId);

    const neighbours: Peer[] = [];
    for (const neighbourId of neighbourIds) {
      const neighbour = this.graph.getNodeAttributes(neighbourId);
      const link = this.graph.getEdgeAttributes(peerId, neighbourId);

      if (neighbour.active && link.active && (!type || link.type === type)) {
        neighbours.push(neighbour);
      }
    }

    return neighbours;
  }

  // retrieves edge attributes for source and destination peer ids
  hasLink(sourceId: UUID, destinationId: UUID, type: LinkType = LinkType.Ranged): boolean {
    const edge = this.graph.getEdgeAttributes(sourceId, destinationId);
    return edge?.type === type;
  }

  // initializes the graph based on provided peer, obstacle and link entities
  init(peers: PeerEntity[], obstacles: ObstacleEntity[], links: LinkEntity[]): void {
    this.peers = peers;
    this.obstacles = obstacles;
    this.links = links;

    // converting peer entities into graph nodes
    for (const peerEntity of this.peers) {
      const { id, protocol, range, configuration, x, y, enabled } = peerEntity;

      const module = createModule(peerEntity, this, this.eventRecorder);
      const peer = {
        id: id,
        active: enabled,
        configuration: configuration,
        coordinates: { x: x, y: y } as Coordinate,
        range: range,
        protocol: protocol,
        module: module,
      } satisfies Peer;
      this.graph.addNode(id, peer);
    }

    // processing linked connections based on link entities
    for (const linkEntity of links) {
      const { sourcePeerId: sourceId, destinationPeerId: destinationId, enabled } = linkEntity;
      const isEdgeExists = this.graph.hasEdge(sourceId, destinationId);

      if (!isEdgeExists) {
        this.graph.addEdge(sourceId, destinationId, {
          id: linkEntity.id,
          type: LinkType.Wired,
          active: enabled,
        } satisfies Link);
      }
    }

    // processing ranged links based on peer and obstacle positions
    const bounds: ObstacleBounds[] = obstacles.map(getObstacleBounds);
    for (const source of peers) {
      const { id: sourceId } = source;

      for (const destination of peers) {
        const { id: destinationId } = destination;
        if (sourceId === destinationId) {
          continue;
        }

        const isEdgeExists = this.graph.hasEdge(sourceId, destinationId);
        if (!isEdgeExists && canCreateRangedConnection(source, destination, bounds)) {
          this.graph.addEdge(source.id, destination.id, {
            id: generateUUID(),
            type: LinkType.Ranged,
            active: true,
          } satisfies Link);
        }
      }
    }

    for (const nodes of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(nodes);
      (node.module as BaseModule).init();
    }
  }

  private refreshLinks(): void {
    // processing ranged links based on peer and obstacle positions
    const bounds: ObstacleBounds[] = this.obstacles.map(getObstacleBounds);
    for (const node of this.graph.nodes()) {
      const source = this.graph.getNodeAttributes(node);
      const { id: sourceId } = source;

      for (const destinationNode of this.graph.nodes()) {
        const destination = this.graph.getNodeAttributes(destinationNode);
        const { id: destinationId } = destination;
        if (sourceId === destinationId) {
          continue;
        }

        const sourcePeer = this.peers.find((peer) => peer.id === sourceId)!;
        const destinationPeer = this.peers.find((peer) => peer.id === destinationId)!;

        const sourceNode = this.graph.getNodeAttributes(sourceId);

        const source = {
          ...sourcePeer,
          x: sourceNode.coordinates.x,
          y: sourceNode.coordinates.y,
          enabled: sourceNode.active,
        };

        const dest = {
          ...destinationPeer,
          x: destination.coordinates.x,
          y: destination.coordinates.y,
          enabled: destination.active,
        };

        const isEdgeExists = this.graph.hasEdge(sourceId, destinationId);
        if (!isEdgeExists) {
          if (canCreateRangedConnection(source, dest, bounds)) {
            this.graph.addEdge(source.id, destination.id, {
              id: generateUUID(),
              type: LinkType.Ranged,
              active: true,
            } satisfies Link);
          }
        } else {
          const edge = this.graph.getEdgeAttributes(sourceId, destinationId);
          if (edge?.type === LinkType.Ranged) {
            const sourceNode = this.graph.getNodeAttributes(sourceId);
            const destinationNode = this.graph.getNodeAttributes(destinationId);

            const source = {
              ...sourcePeer,
              x: sourceNode.coordinates.x,
              y: sourceNode.coordinates.y,
              enabled: sourceNode.active,
            };

            const destination = {
              ...destinationPeer,
              x: destinationNode.coordinates.x,
              y: destinationNode.coordinates.y,
              enabled: destinationNode.active,
            };

            if (!canCreateRangedConnection(source, destination, bounds)) {
              this.graph.dropEdge(sourceId, destinationId);
            }
          }
        }
      }
    }
  }

  // update all routing modules
  tick() {
    for (const peerId of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(peerId);
      node.module.tick();
    }
  }

  // update peer position
  moveNode(peerId: UUID, x: number, y: number) {
    const node = this.graph.getNodeAttributes(peerId);

    node.coordinates.x = x;
    node.coordinates.y = y;

    this.refreshLinks();
  }

  toggleStatus(entityId: UUID): ToggleStatusResult {
    const peer = this.graph.getNodeAttributes(entityId);
    if (peer) {
      const previousEnabled = peer.active;
      const nextEnabled = !previousEnabled;

      peer.active = nextEnabled;
      return {
        entityType: EntityType.Peer,
        previousEnabled,
        nextEnabled,
      };
    }

    const linkId = this.graph.findEdge((_, attributes) => attributes.id === entityId);
    if (linkId) {
      const edge = this.graph.getEdgeAttributes(linkId);
      const previousEnabled = edge.active;
      const nextEnabled = !previousEnabled;
      edge.active = nextEnabled;

      return {
        entityType: EntityType.Link,
        previousEnabled,
        nextEnabled,
      };
    }

    return null;
  }

  snapshot(tick: number): Snapshot {
    const peers = this.graph.nodes().map((nodeId) => {
      const peer = this.peers.find((p) => p.id === nodeId)!;
      const node = this.graph.getNodeAttributes(nodeId);
      return {
        ...peer,
        enabled: node.active,
        x: node.coordinates.x,
        y: node.coordinates.y,
      };
    });

    return {
      tick,
      entities: [...peers, ...this.obstacles, ...this.links],
      peers: this.graph.nodes().map((nodeId) => {
        const peer = this.graph.getNodeAttributes(nodeId);
        const structures = (peer.module as BaseModule).getTables();

        return {
          ...peers.find((p) => p.id === nodeId)!,
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
