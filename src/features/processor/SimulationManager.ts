import { EventRecorder } from "@/features/processor/EventRecorder";
import { AodvModule } from "@/features/processor/module/aodv/AodvModule";
import { DsdvModule } from "@/features/processor/module/dsdv/DsdvModule";
import { OlsrModule } from "@/features/processor/module/olsr/OlsrModule";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import {
  type SimulationInput,
  type SimulationResult,
  type Snapshot,
  type StepResult,
} from "@/shared/types/common/simulation";
import { EntityType, type NetworkEntity } from "@/shared/types/model/entities";
import {
  RefreshAction,
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
import { BatmanModule } from "./module/batman/BatmanModule";
import { NetworkGraph } from "./new/NetworkGraph";
import { groupStepsByTick } from "./utils/steps";

export class SimulationManager {
  private readonly eventRecorder: EventRecorder = new EventRecorder();

  private readonly stepsByTick: Step[][];
  private readonly networkGraph: NetworkGraph = new NetworkGraph(this.eventRecorder);

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

        // capturing of events and states
        const events: Event[] = [];
        const snapshots: Snapshot[] = [];

        this.eventRecorder.setListener((event) => {
          events.push(event);
          snapshots.push(this.networkGraph.snapshot(tick));
        });

        // processing of the step
        this.processStep(step);

        result.push({
          step,
          events,
          eventSnapshots: snapshots,
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
    const { entityId } = step;
    if (!entityId) {
      throw new Error("Toggle step must have an entity id");
    }

    const result = this.networkGraph.toggleStatus(entityId);
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
    const { peerId, protocol, action } = step;

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

    module.tick();
    if (protocol === RoutingProtocol.DSDV) {
      this.processDsdvRefreshStep(action, module as DsdvModule);
    } else if (protocol === RoutingProtocol.OLSR) {
      this.processOlsrRefreshStep(action, module as OlsrModule);
    } else if (protocol === RoutingProtocol.BATMAN) {
      this.processBatmanRefreshStep(action, module as BatmanModule);
    } else if (protocol === RoutingProtocol.AODV) {
      this.processAodvRefreshStep(action, module as AodvModule);
    }
  }

  private processBatmanRefreshStep(action: RefreshAction, module: BatmanModule): void {
    if (action === RefreshAction.BatmanElp) {
      module.refreshEchoLocation();
    } else if (action === RefreshAction.BatmanOgm) {
      module.refreshOriginators();
    }
  }

  private processDsdvRefreshStep(action: RefreshAction, module: DsdvModule): void {
    if (action === RefreshAction.DsdvFullDump) {
      module.refreshFullDump();
    } else if (action === RefreshAction.DsdvIncremental) {
      module.refreshIncremental();
    }
  }

  private processOlsrRefreshStep(action: RefreshAction, module: OlsrModule): void {
    if (action === RefreshAction.OlsrHello) {
      module.refreshHello();
    } else if (action === RefreshAction.OlsrTc) {
      module.refreshTc();
    }
  }

  private processAodvRefreshStep(action: RefreshAction, module: AodvModule): void {
    if (action === RefreshAction.AodvHello) {
      module.refreshHello();
    }
  }
}
