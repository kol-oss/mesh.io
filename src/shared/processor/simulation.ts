import { AodvModule } from "@/shared/processor/aodv/AodvModule";
import { BatmanModule } from "@/shared/processor/batman/BatmanModule";
import { EventRecorder } from "@/shared/processor/core/EventRecorder";
import type { RoutingModule } from "@/shared/processor/core/runtimeTypes";
import { DsdvModule } from "@/shared/processor/dsdv/DsdvModule";
import { OlsrModule } from "@/shared/processor/olsr/OlsrModule";
import { RuntimeNetwork } from "@/shared/processor/types/network";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import {
  EventType,
  SimulationMessageKind,
  type EntityStatusChangedEventDetails,
  type Packet,
  type PeerMovedEventDetails,
  type SimulationInput,
  type SimulationResult,
  type Snapshot,
  type StepResult,
} from "@/shared/types/model/simulation";
import { RefreshAction, StepType, type Step } from "@/shared/types/model/steps";
import { sortStepsByTick } from "./steps";

export function runSimulation(input: SimulationInput): SimulationResult {
  const { entities, steps } = input;

  const eventRecorder = new EventRecorder();
  const network = new RuntimeNetwork(entities, eventRecorder);
  const sortedSteps = sortStepsByTick(steps);
  const stepResults: StepResult[] = [];
  const eventSnapshots: Snapshot[] = [];

  eventRecorder.addListener(() => {
    eventSnapshots.push(network.snapshot(eventRecorder.getCurrentTick()));
  });

  let simulationTick = 1;
  let stepIndex = 0;
  while (stepIndex < sortedSteps.length) {
    const tick = sortedSteps[stepIndex].tick;
    while (simulationTick < tick) {
      network.tickModules();
      eventRecorder.addTick(1);
      simulationTick += 1;
    }

    const stepEventsForTick: Step[] = [];
    while (stepIndex < sortedSteps.length && sortedSteps[stepIndex].tick === tick) {
      stepEventsForTick.push(sortedSteps[stepIndex]);
      stepIndex += 1;
    }

    for (const step of stepEventsForTick) {
      eventRecorder.setCurrentStep(step.id);
      const beforeCount = eventRecorder.getEvents().length;
      const beforeSnapshotsCount = eventSnapshots.length;
      processStep(step, network, eventRecorder);
      stepResults.push({
        step,
        events: eventRecorder.getEvents().slice(beforeCount),
        eventSnapshots: eventSnapshots.slice(beforeSnapshotsCount),
        snapshot: network.snapshot(eventRecorder.getCurrentTick()),
      });
    }

    eventRecorder.addTick(1);
    simulationTick += 1;
  }

  eventRecorder.setCurrentStep(null);

  return {
    events: eventRecorder.getEvents(),
    steps: sortedSteps,
    stepResults,
  };
}

const processStep = (step: Step, network: RuntimeNetwork, eventRecorder: EventRecorder) => {
  if (step.type === StepType.Move) {
    if (!step.entityId) {
      return;
    }

    const peer = network.getPeer(step.entityId);
    if (!peer) {
      return;
    }

    const currentPeer = peer.getEntity();
    const moveDetails: PeerMovedEventDetails = {
      peerId: step.entityId,
      fromX: currentPeer.x,
      fromY: currentPeer.y,
      toX: step.x,
      toY: step.y,
    };

    network.updatePeerPosition(step.entityId, step.x, step.y);
    network.refreshConnectivity();
    eventRecorder.record(step.entityId, EventType.SystemPeerMoved, moveDetails);
    return;
  }

  if (step.type === StepType.Toggle) {
    if (!step.entityId) {
      return;
    }

    const toggleResult = network.toggleEntity(step.entityId);
    if (!toggleResult) {
      return;
    }

    network.refreshConnectivity();

    const statusDetails: EntityStatusChangedEventDetails = {
      entityId: step.entityId,
      entityType: toggleResult.entityType,
      previousEnabled: toggleResult.previousEnabled,
      nextEnabled: toggleResult.nextEnabled,
    };

    eventRecorder.record(step.entityId, EventType.SystemEntityStatusChanged, statusDetails);
    return;
  }

  if (step.type === StepType.Refresh) {
    const peer = network.getPeer(step.peerId);
    const module = peer?.getModule(step.protocol);
    if (!module) {
      return;
    }

    if (step.protocol === RoutingProtocol.BATMAN && step.action === RefreshAction.BatmanElp) {
      if (!(module instanceof BatmanModule)) {
        return;
      }
      module.refreshElp();
      return;
    }

    if (step.protocol === RoutingProtocol.BATMAN && step.action === RefreshAction.BatmanOgm) {
      if (!(module instanceof BatmanModule)) {
        return;
      }
      // Route aging and stale removals are processed on OGM refresh cadence.
      module.tick();
      module.refreshOgm();
      return;
    }

    if (step.protocol === RoutingProtocol.DSDV && step.action === RefreshAction.DsdvFullDump) {
      if (!(module instanceof DsdvModule)) {
        return;
      }

      module.tick();
      module.refreshFullDump();
      return;
    }

    if (step.protocol === RoutingProtocol.DSDV && step.action === RefreshAction.DsdvIncremental) {
      if (!(module instanceof DsdvModule)) {
        return;
      }

      module.tick();
      module.refreshIncremental();
      return;
    }

    if (step.protocol === RoutingProtocol.AODV && step.action === RefreshAction.AodvHello) {
      if (!(module instanceof AodvModule)) {
        return;
      }

      module.tick();
      module.refreshHello();
      return;
    }

    if (step.protocol === RoutingProtocol.OLSR && step.action === RefreshAction.OlsrHello) {
      if (!(module instanceof OlsrModule)) {
        return;
      }

      module.tick();
      module.refreshHello();
      return;
    }

    if (step.protocol === RoutingProtocol.OLSR && step.action === RefreshAction.OlsrTc) {
      if (!(module instanceof OlsrModule)) {
        return;
      }

      module.tick();
      module.refreshTc();
      return;
    }

    module.tick();
    module.refresh();
    return;
  }

  if (!step.sourceId || !step.destinationId) {
    return;
  }

  const sourcePeer = network.getPeer(step.sourceId);
  const sourceProtocol = sourcePeer?.getPrimaryProtocol() ?? null;
  const sourceModule = sourceProtocol ? sourcePeer?.getModule(sourceProtocol) : null;
  if (!sourceModule || !isPacketCapableModule(sourceModule)) {
    eventRecorder.record(step.sourceId, EventType.SystemMessageDropped, {
      reason: sourcePeer
        ? `Source peer does not have a ${sourceProtocol ?? "Unknown"} module`
        : "Source peer does not exist",
      reasonCode: "SOURCE_UNAVAILABLE",
    });
    return;
  }

  const packet: Packet = {
    kind: SimulationMessageKind.Packet,
    sourcePeerId: null,
    destinationPeerId: step.destinationId,
    timeToLive: 50,
  };
  sourceModule.send(packet);
};

const isPacketCapableModule = (module: RoutingModule): module is RoutingModule => {
  return typeof (module as RoutingModule).send === "function";
};
