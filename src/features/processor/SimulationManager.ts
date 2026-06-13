import { EventRecorderImpl } from "@/features/processor/EventRecorder";
import type { EventRecorder } from "@/features/processor/types/recorder";
import { isReactive } from "@/features/processor/utils/protocol/protocols.ts";
import {
  EventType,
  type Event,
  type MoveEventDetails,
  type StatusChangeEventDetails,
} from "@/shared/types/common/events.ts";
import { MessageType, type Packet } from "@/shared/types/common/messages.ts";
import {
  type PeerSnapshot,
  type SimulationInput,
  type SimulationResult,
  type StepResult,
} from "@/shared/types/common/simulation";
import { EntityType, type NetworkEntity } from "@/shared/types/model/entities";
import {
  StepType,
  type MessageStep,
  type MoveStep,
  type RefreshStep,
  type Step,
  type ToggleStep,
} from "@/shared/types/model/steps";
import { DEFAULT_TIME_TO_LIVE } from "./constants/message";
import { NetworkGraphImpl } from "./network/NetworkGraph";
import type { NetworkGraph } from "./types/network/graph";
import { groupStepsByTick } from "./utils/steps";

// only change events are taken for snapshot
const SNAPSHOT_EVENT_TYPES = [
  EventType.AddRoute,
  EventType.UpdateRoute,
  EventType.DeleteRoute,
  EventType.Calculation,
];

export class SimulationManager {
  private readonly eventRecorder: EventRecorder = new EventRecorderImpl();

  private readonly stepsByTick: Step[][];
  private readonly networkGraph: NetworkGraph = new NetworkGraphImpl(this.eventRecorder);
  private readonly stepStartTables: PeerSnapshot[][] = [];
  private readonly stepEventDeltas: (PeerSnapshot | null)[][] = [];

  private constructor(entities: NetworkEntity[], steps: Step[]) {
    this.networkGraph.init(
      entities.filter((entity) => entity.type === EntityType.Peer),
      entities.filter((entity) => entity.type === EntityType.Obstacle),
      entities.filter((entity) => entity.type === EntityType.Link),
    );

    this.stepsByTick = groupStepsByTick(steps);
  }

  // prepares processor for execution
  static prepare(input: SimulationInput): SimulationManager {
    const { entities, steps } = input;
    return new SimulationManager(entities, steps);
  }

  // runs the simulation and returns the snapshots for each step
  run(): SimulationResult {
    const result: StepResult[] = [];
    for (const steps of this.stepsByTick) {
      const tick = this.eventRecorder.getCurrentTick();

      for (const step of steps) {
        this.eventRecorder.setStep(step);

        // capture state at step start (before processing)
        this.stepStartTables.push(this.networkGraph.peerTables());

        // capturing events emitted during this step
        const events: Event[] = [];
        const eventDeltas: (PeerSnapshot | null)[] = [];

        this.eventRecorder.setListener((event) => {
          const { type, peerId } = event;

          events.push(event);
          if (SNAPSHOT_EVENT_TYPES.includes(type)) {
            eventDeltas.push(this.networkGraph.peerTableById(peerId));
          } else {
            eventDeltas.push(null);
          }
        });

        // processing of the step
        this.processStep(step);
        this.stepEventDeltas.push(eventDeltas);

        result.push({
          step,
          events,
          snapshot: this.networkGraph.snapshot(tick),
        } satisfies StepResult);
      }
    }

    return {
      events: this.eventRecorder.getEvents(),
      steps: [],
      stepResults: result,
    } satisfies SimulationResult;
  }

  // returns routing table data captured at the start of the given step
  getStepTables(stepIndex: number): PeerSnapshot[] | null {
    return this.stepStartTables[stepIndex] ?? null;
  }

  // reconstructs routing table state at a specific event within a step by
  // starting from the step-start snapshot and applying only per-peer deltas
  getTablesAtEvent(stepIndex: number, eventIndex: number): PeerSnapshot[] | null {
    const base = this.stepStartTables[stepIndex];
    if (!base) return null;

    const deltas = this.stepEventDeltas[stepIndex];
    if (!deltas || deltas.length === 0) return base;

    const result = new Map(base.map((s) => [s.peerId, s]));
    for (let i = 0; i <= eventIndex && i < deltas.length; i++) {
      const delta = deltas[i];
      if (delta) {
        result.set(delta.peerId, delta);
      }
    }
    return Array.from(result.values());
  }

  // processes a single step and updates the state of the network
  private processStep(step: Step): void {
    const { type: stepType } = step;
    if (stepType === StepType.Move) {
      this.processMoveStep(step);
    } else if (stepType === StepType.Toggle) {
      this.processToggleStep(step);
    } else if (stepType === StepType.Message) {
      this.processMessageStep(step);
    } else if (stepType === StepType.Refresh) {
      this.processRefreshStep(step);
    }
  }

  private processMoveStep(step: MoveStep): void {
    const { entityId, x, y } = step;
    if (!entityId) {
      throw new Error("Move step must have an entity id");
    }

    const node = this.networkGraph.getNode(entityId);
    if (!node) {
      throw new Error("Move step must have a valid entity id");
    }

    const details: MoveEventDetails = {
      peerId: entityId,
      fromX: node.coordinates.x,
      fromY: node.coordinates.y,
      toX: x,
      toY: y,
    };

    if (isReactive(node.protocol)) node.module.refresh();

    this.networkGraph.moveNode(entityId, x, y);
    this.eventRecorder.record(entityId, EventType.Move, details);
  }

  private processToggleStep(step: ToggleStep): void {
    const { entityId, status } = step;
    if (!entityId) {
      throw new Error("Toggle step must have an entity id");
    }
    const result = this.networkGraph.setStatus(entityId, status);
    if (!result) {
      throw new Error("Toggle step must have a valid entity id");
    }

    const details: StatusChangeEventDetails = {
      entityId,
      entityType: result.entityType,
      previousEnabled: result.previousEnabled,
      nextEnabled: result.nextEnabled,
    };

    if (result.entityType === EntityType.Peer) {
      const peer = this.networkGraph.getNode(entityId);
      if (isReactive(peer.protocol)) peer.module.refresh();
    }

    this.eventRecorder.record(entityId, EventType.StatusChange, details);
  }

  private processMessageStep(step: MessageStep): void {
    const { sourceId, destinationId } = step;
    if (!sourceId || !destinationId) {
      throw new Error("Message step must have a valid source and destination id");
    }

    const peer = this.networkGraph.getNode(sourceId);
    if (!peer) {
      throw new Error("Message step must have a valid source");
    }

    const module = peer.module;
    if (!module) {
      throw new Error("Source peer does not support the configured protocol");
    }

    const packet: Packet = {
      type: MessageType.Packet,
      sourcePeerId: sourceId,
      destinationPeerId: destinationId,
      timeToLive: DEFAULT_TIME_TO_LIVE,
    };

    if (isReactive(peer.protocol)) module.refresh();

    module.send(packet);
  }

  private processRefreshStep(step: RefreshStep): void {
    const { peerId, action } = step;

    const peer = this.networkGraph.getNode(peerId);
    if (!peer) {
      throw new Error("Refresh step must have a valid peer id");
    }

    const module = peer.module;
    if (!module) {
      throw new Error("Refresh step must have a valid module for the given protocol");
    }

    if (!action) {
      throw new Error("Refresh step must have a valid action");
    }

    // empty refresh for timeout processing
    module.refresh();

    // specific refresh actions for protocol
    module.refresh(action);
  }
}
