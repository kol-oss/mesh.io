import type { Snapshot } from "@/shared/types/common/simulation";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import {
  EntityType,
  type LinkEntity,
  type ObstacleEntity,
  type PeerEntity,
} from "@/shared/types/model/entities";
import Graph, { UndirectedGraph } from "graphology";
import type { EventRecorder } from "../EventRecorder";
import type { BaseModule } from "../module/BaseModule";
import type { BoundingBox } from "../types/bound";
import { RoutingStructure } from "../types/module";
import { LinkType, type Link } from "../types/network/link";
import type { Peer } from "../types/network/peer";
import type { ToggleStatusResult } from "../types/network/step";
import { isRangedConnected } from "../utils/connection";
import { mapEntityToNode, mapNodeToEntity } from "../utils/mapper";
import { getBoundingBox } from "../utils/math/bound";
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

    // adding nodes based on peer entities
    for (const peerEntity of this.peers) {
      const { id } = peerEntity;
      const module = createModule(peerEntity, this, this.eventRecorder);

      const node = mapEntityToNode(peerEntity, module);
      this.graph.addNode(id, node);
    }

    // adding edges based on link entities
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

    // adding edges based on peer ranges and obstacles
    this.refreshRangedLinks();

    // initializing modules for all peers
    for (const nodes of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(nodes);
      (node.module as BaseModule).init();
    }
  }

  // processing ranged links based on peer and obstacle positions
  private refreshRangedLinks(): void {
    // retrieve bounding boxes for all obstacles
    const bounds: BoundingBox[] = this.obstacles.map((obstacle) =>
      getBoundingBox(obstacle, obstacle.width, obstacle.height),
    );

    for (const node of this.graph.nodes()) {
      const source = this.graph.getNodeAttributes(node);
      const { id: sourceId } = source;

      for (const otherNode of this.graph.nodes()) {
        const destination = this.graph.getNodeAttributes(otherNode);
        const { id: destinationId } = destination;
        if (sourceId === destinationId) {
          continue;
        }

        const isEdgeExists = this.graph.hasEdge(sourceId, destinationId);
        // if no edge exists but can, then new ranged edge is added
        if (!isEdgeExists && isRangedConnected(source, destination, bounds)) {
          this.graph.addEdge(sourceId, destinationId, {
            id: generateUUID(),
            type: LinkType.Ranged,
            active: true,
          } satisfies Link);
        }
        // if edge exists but cannot be connected, then edge is removed
        else if (isEdgeExists) {
          const edge = this.graph.getEdgeAttributes(sourceId, destinationId);
          if (edge.type === LinkType.Ranged) {
            if (!isRangedConnected(source, destination, bounds)) {
              this.graph.dropEdge(sourceId, destinationId);
            }
          }
        }
      }
    }
  }

  // update node position and refresh ranged links
  moveNode(nodeId: UUID, x: number, y: number) {
    const node = this.graph.getNodeAttributes(nodeId);

    node.coordinates.x = x;
    node.coordinates.y = y;

    this.refreshRangedLinks();
  }

  // set status of the node or edge
  setStatus(entityId: UUID, active: boolean): ToggleStatusResult {
    const node = this.graph.getNodeAttributes(entityId);
    if (node) {
      const previousEnabled = node.active;

      node.active = active;
      return {
        entityType: EntityType.Peer,
        previousEnabled,
        nextEnabled: active,
      } satisfies ToggleStatusResult;
    }

    const edgeId = this.graph.findEdge((_, attributes) => attributes.id === entityId);
    if (edgeId) {
      const edge = this.graph.getEdgeAttributes(edgeId);

      const previousEnabled = edge.active;
      edge.active = active;

      return {
        entityType: EntityType.Link,
        previousEnabled,
        nextEnabled: active,
      } satisfies ToggleStatusResult;
    }

    return null;
  }

  snapshot(tick: number): Snapshot {
    const entities = this.graph.nodes().map((id) => {
      const node = this.graph.getNodeAttributes(id);
      return mapNodeToEntity(node);
    });

    return {
      tick,
      entities: [...entities, ...this.obstacles, ...this.links],
      peers: this.graph.nodes().map((nodeId) => {
        const peer = this.graph.getNodeAttributes(nodeId);
        const structures = (peer.module as BaseModule).getTables();

        return {
          ...mapNodeToEntity(peer),
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
