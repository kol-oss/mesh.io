import { EventRecorder } from "@/features/processor/EventRecorder";
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
import {
  EventType,
  type Event,
  type MoveEventDetails,
  type StatusChangeEventDetails,
} from "../../shared/types/common/events";
import { MessageType, type Packet } from "../../shared/types/common/messages";
import { DEFAULT_TIME_TO_LIVE } from "./constants/message";
import { NetworkGraph } from "./network/NetworkGraph";
import { groupStepsByTick } from "./utils/steps";

export class SimulationManager {
  private readonly eventRecorder: EventRecorder = new EventRecorder();

  private readonly stepsByTick: Step[][];
  private readonly networkGraph: NetworkGraph = new NetworkGraph(this.eventRecorder);
  private readonly stepPeerTables: PeerSnapshot[][] = [];
  // per-event tables: eventPeerTables[stepIndex][rawEventIndex]
  private readonly eventPeerTables: PeerSnapshot[][][] = [];

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

        // capturing events emitted during this step
        const events: Event[] = [];
        const eventTables: PeerSnapshot[][] = [];

        this.eventRecorder.setListener((event) => {
          events.push(event);
          // capture tables immediately after each event so per-event state is preserved
          eventTables.push(this.networkGraph.peerTables());
        });

        // processing of the step
        this.processStep(step);
        this.stepPeerTables.push(this.networkGraph.peerTables());
        this.eventPeerTables.push(eventTables);

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

  // returns full peer routing table data for a specific step index
  getStepPeerTables(stepIndex: number): PeerSnapshot[] | null {
    return this.stepPeerTables[stepIndex] ?? null;
  }

  // returns full peer routing table data after a specific raw event within a step
  getEventPeerTables(stepIndex: number, rawEventIndex: number): PeerSnapshot[] | null {
    return this.eventPeerTables[stepIndex]?.[rawEventIndex] ?? null;
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
      throw new Error("Toggle step must have a valid configuration");
    }

    const details: StatusChangeEventDetails = {
      entityId,
      entityType: result.entityType,
      previousEnabled: result.previousEnabled,
      nextEnabled: result.nextEnabled,
    };

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
