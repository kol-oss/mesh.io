import { RoutingProtocol, StepType } from "../types/enums";
import { ui } from "../i18n/messages";
import type { LinkEntity, NetworkEntity, PeerEntity } from "../types/entities";
import type { WorkflowStep } from "../types/steps";
import {
  SimulationEventType,
  SimulationMessageKind,
  type SimulationInput,
  type SimulationPacket,
  type SimulationResult,
  type SimulationStepResult,
  type SimulationTickSnapshot,
} from "../types/simulation";
import { getObstacleBounds, hasLineOfSight } from "../utils/geometry";
import { BatmanModule } from "./batman/BatmanModule";
import { SimulationEventRecorder } from "./core/EventRecorder";
import type {
  RoutingProtocolModule,
  SimulationNetworkRuntime,
  SnapshotCapablePeerNode,
} from "./core/runtimeTypes";

type RuntimeLink = LinkEntity;

const cloneEntity = <T extends NetworkEntity>(entity: T): T => ({ ...entity });

class RuntimePeer implements SnapshotCapablePeerNode {
  private readonly modules = new Map<RoutingProtocol, RoutingProtocolModule>();

  private readonly rangedPeerIds = new Set<string>();

  private readonly linkedPeerIds = new Set<string>();

  private readonly entity: PeerEntity;

  private readonly network: RuntimeNetwork;

  constructor(entity: PeerEntity, network: RuntimeNetwork, eventRecorder: SimulationEventRecorder) {
    this.entity = entity;
    this.network = network;

    for (const protocol of entity.protocols) {
      if (protocol === RoutingProtocol.BATMAN) {
        this.modules.set(protocol, new BatmanModule(this, eventRecorder));
      }
    }
  }

  get id() {
    return this.entity.id;
  }

  get name() {
    return this.entity.name;
  }

  isActive() {
    return this.entity.enabled;
  }

  supports(protocol: RoutingProtocol) {
    return this.modules.has(protocol);
  }

  getModule(protocol: RoutingProtocol) {
    return this.modules.get(protocol) ?? null;
  }

  getPeerEntity() {
    return this.entity;
  }

  setPosition(x: number, y: number) {
    this.entity.x = x;
    this.entity.y = y;
  }

  setEnabled(enabled: boolean) {
    this.entity.enabled = enabled;
  }

  clearTopology() {
    this.rangedPeerIds.clear();
    this.linkedPeerIds.clear();
  }

  addRangedPeer(peerId: string) {
    this.rangedPeerIds.add(peerId);
  }

  addLinkedPeer(peerId: string) {
    this.linkedPeerIds.add(peerId);
  }

  getNeighbour(peerId: string) {
    if (!this.isActive()) {
      return null;
    }

    if (!this.rangedPeerIds.has(peerId) && !this.linkedPeerIds.has(peerId)) {
      return null;
    }

    const neighbour = this.network.getPeer(peerId);
    return neighbour?.isActive() ? neighbour : null;
  }

  getNeighbours() {
    const neighbourIds = new Set([...this.rangedPeerIds, ...this.linkedPeerIds]);
    const neighbours: RuntimePeer[] = [];

    for (const peerId of neighbourIds) {
      const peer = this.network.getPeer(peerId);
      if (peer?.isActive()) {
        neighbours.push(peer);
      }
    }

    return neighbours;
  }

  getRoutingTable() {
    const batmanModule = this.modules.get(RoutingProtocol.BATMAN);
    if (!(batmanModule instanceof BatmanModule)) {
      return [];
    }

    return batmanModule.getRoutes();
  }
}

class RuntimeNetwork implements SimulationNetworkRuntime {
  private readonly peers = new Map<string, RuntimePeer>();

  private readonly links = new Map<string, RuntimeLink>();

  private readonly entityOrder: Array<{ type: NetworkEntity["type"]; id: string }> = [];

  private readonly obstacles: NetworkEntity[] = [];

  constructor(entities: NetworkEntity[], eventRecorder: SimulationEventRecorder) {
    for (const entity of entities) {
      this.entityOrder.push({ type: entity.type, id: entity.id });

      if (entity.type === "PEER") {
        const peerEntity = cloneEntity(entity);
        this.peers.set(peerEntity.id, new RuntimePeer(peerEntity, this, eventRecorder));
        continue;
      }

      if (entity.type === "LINK") {
        this.links.set(entity.id, cloneEntity(entity));
        continue;
      }

      this.obstacles.push(cloneEntity(entity));
    }

    this.refreshConnectivity();
  }

  getPeer(peerId: string) {
    return this.peers.get(peerId) ?? null;
  }

  getPeers() {
    return [...this.peers.values()];
  }

  refreshConnectivity() {
    const peerList = this.getPeers();
    const obstacleBounds = this.obstacles
      .filter(
        (entity): entity is Extract<NetworkEntity, { type: "OBSTACLE" }> =>
          entity.type === "OBSTACLE",
      )
      .map(getObstacleBounds);

    for (const peer of peerList) {
      peer.clearTopology();
    }

    for (let index = 0; index < peerList.length; index += 1) {
      const source = peerList[index];
      if (!source.isActive()) {
        continue;
      }

      for (let innerIndex = index + 1; innerIndex < peerList.length; innerIndex += 1) {
        const destination = peerList[innerIndex];
        if (!destination.isActive()) {
          continue;
        }

        const sourceEntity = source.getPeerEntity();
        const destinationEntity = destination.getPeerEntity();
        const distance = Math.hypot(
          destinationEntity.x - sourceEntity.x,
          destinationEntity.y - sourceEntity.y,
        );
        const inRange = distance <= Math.min(sourceEntity.range, destinationEntity.range);
        const clearLineOfSight = hasLineOfSight(
          sourceEntity.x,
          sourceEntity.y,
          destinationEntity.x,
          destinationEntity.y,
          obstacleBounds,
        );

        if (inRange && clearLineOfSight) {
          source.addRangedPeer(destination.id);
          destination.addRangedPeer(source.id);
        }
      }
    }

    for (const link of this.links.values()) {
      if (!link.enabled || !link.sourcePeerId || !link.destinationPeerId) {
        continue;
      }

      const source = this.getPeer(link.sourcePeerId);
      const destination = this.getPeer(link.destinationPeerId);
      if (!source || !destination || !source.isActive() || !destination.isActive()) {
        continue;
      }

      source.addLinkedPeer(destination.id);
      destination.addLinkedPeer(source.id);
    }
  }

  tickModules() {
    for (const peer of this.getPeers()) {
      const module = peer.getModule(RoutingProtocol.BATMAN);
      module?.tick();
    }
  }

  updatePeerPosition(peerId: string, x: number, y: number) {
    this.peers.get(peerId)?.setPosition(x, y);
  }

  toggleEntity(entityId: string) {
    const peer = this.peers.get(entityId);
    if (peer) {
      peer.setEnabled(!peer.getPeerEntity().enabled);
      return;
    }

    const link = this.links.get(entityId);
    if (link) {
      link.enabled = !link.enabled;
    }
  }

  exportEntities() {
    const peerEntities = new Map<string, NetworkEntity>();
    for (const peer of this.getPeers()) {
      peerEntities.set(peer.id, { ...peer.getPeerEntity() });
    }

    const linkEntities = new Map<string, NetworkEntity>();
    for (const link of this.links.values()) {
      linkEntities.set(link.id, { ...link });
    }

    const obstacleEntities = new Map<string, NetworkEntity>();
    for (const obstacle of this.obstacles) {
      obstacleEntities.set(obstacle.id, { ...obstacle });
    }

    return this.entityOrder
      .map(({ type, id }) => {
        if (type === "PEER") {
          return peerEntities.get(id) ?? null;
        }

        if (type === "LINK") {
          return linkEntities.get(id) ?? null;
        }

        return obstacleEntities.get(id) ?? null;
      })
      .filter((entity): entity is NetworkEntity => entity !== null);
  }

  snapshot(tick: number): SimulationTickSnapshot {
    return {
      tick,
      entities: this.exportEntities(),
      peers: this.getPeers().map((peer) => ({
        ...peer.getPeerEntity(),
        routingTable: peer.getRoutingTable(),
      })),
    };
  }
}

const sortSteps = (steps: WorkflowStep[]) => {
  return [...steps]
    .map((step, index) => ({ step, index }))
    .sort((left, right) => {
      if (left.step.tick !== right.step.tick) {
        return left.step.tick - right.step.tick;
      }

      return left.index - right.index;
    })
    .map(({ step }) => step);
};

export function runSimulation(input: SimulationInput): SimulationResult {
  const eventRecorder = new SimulationEventRecorder();
  const network = new RuntimeNetwork(input.entities, eventRecorder);
  const steps = sortSteps(input.steps);
  const stepResults: SimulationStepResult[] = [];

  let simulationTick = 1;
  let stepIndex = 0;
  while (stepIndex < steps.length) {
    const tick = steps[stepIndex].tick;
    while (simulationTick < tick) {
      network.tickModules();
      eventRecorder.addTick(1);
      simulationTick += 1;
    }

    const stepEventsForTick: WorkflowStep[] = [];
    while (stepIndex < steps.length && steps[stepIndex].tick === tick) {
      stepEventsForTick.push(steps[stepIndex]);
      stepIndex += 1;
    }

    for (const step of stepEventsForTick) {
      eventRecorder.setCurrentStep(step.id);
      const beforeCount = eventRecorder.getEvents().length;
      processStep(step, network, eventRecorder);
      stepResults.push({
        step,
        events: eventRecorder.getEvents().slice(beforeCount),
        snapshot: network.snapshot(eventRecorder.getCurrentTick()),
      });
    }

    network.tickModules();
    eventRecorder.addTick(1);
    simulationTick += 1;
  }

  eventRecorder.setCurrentStep(null);

  return {
    events: eventRecorder.getEvents(),
    steps,
    stepResults,
  };
}

const processStep = (
  step: WorkflowStep,
  network: RuntimeNetwork,
  eventRecorder: SimulationEventRecorder,
) => {
  if (step.type === StepType.Move) {
    network.updatePeerPosition(step.movePeerId, step.x, step.y);
    network.refreshConnectivity();
    return;
  }

  if (step.type === StepType.ToggleStatus) {
    network.toggleEntity(step.targetEntityId);
    network.refreshConnectivity();
    return;
  }

  if (step.type === StepType.Refresh) {
    if (step.refreshProtocol !== RoutingProtocol.BATMAN) {
      return;
    }

    const peer = network.getPeer(step.refreshPeerId);
    peer?.getModule(RoutingProtocol.BATMAN)?.refresh();
    return;
  }

  const sourcePeer = network.getPeer(step.sourcePeerId);
  const sourceModule = sourcePeer?.getModule(RoutingProtocol.BATMAN);
  if (!(sourceModule instanceof BatmanModule)) {
    const packet: SimulationPacket = {
      kind: SimulationMessageKind.Packet,
      sourcePeerId: null,
      destinationPeerId: step.destinationPeerId,
      timeToLive: 50,
    };

    eventRecorder.save(step.sourcePeerId, SimulationEventType.SystemMessageDropped, {
      message: packet,
      reason: sourcePeer ? ui.runtime.sourcePeerNoBatmanModule : ui.runtime.sourcePeerMissing,
    });
    return;
  }

  const packet: SimulationPacket = {
    kind: SimulationMessageKind.Packet,
    sourcePeerId: null,
    destinationPeerId: step.destinationPeerId,
    timeToLive: 50,
  };
  sourceModule.send(packet);
};
