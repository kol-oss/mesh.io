import { RoutingProtocol } from "@/shared/types/common/protocols";
import { RefreshAction, StepType, type WorkflowStep } from "@/shared/types/model/steps";
import {
  SimulationEventType,
  SimulationMessageKind,
  type EntityStatusChangedEventDetails,
  type PeerMovedEventDetails,
  type SimulationInput,
  type SimulationPacket,
  type SimulationResult,
  type SimulationStepResult,
  type SimulationTickSnapshot,
} from "@/shared/types/model/simulation";
import { BatmanModule } from "@/shared/processor/batman/BatmanModule";
import { AodvModule } from "@/shared/processor/aodv/AodvModule";
import { DsdvModule } from "@/shared/processor/dsdv/DsdvModule";
import { OlsrModule } from "@/shared/processor/olsr/OlsrModule";
import { SimulationEventRecorder } from "@/shared/processor/core/EventRecorder";
import type { PacketCapableModule, RoutingProtocolModule } from "@/shared/processor/core/runtimeTypes";
import { RuntimeNetwork } from "@/shared/processor/types/network";

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
  const eventSnapshots: SimulationTickSnapshot[] = [];

  eventRecorder.onSave(() => {
    eventSnapshots.push(network.snapshot(eventRecorder.getCurrentTick()));
  });

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
    if (!step.movePeerId) {
      return;
    }

    const peer = network.getPeer(step.movePeerId);
    if (!peer) {
      return;
    }

    const currentPeer = peer.getPeerEntity();
    const moveDetails: PeerMovedEventDetails = {
      peerId: step.movePeerId,
      fromX: currentPeer.x,
      fromY: currentPeer.y,
      toX: step.x,
      toY: step.y,
    };

    network.updatePeerPosition(step.movePeerId, step.x, step.y);
    network.refreshConnectivity();
    eventRecorder.save(step.movePeerId, SimulationEventType.SystemPeerMoved, moveDetails);
    return;
  }

  if (step.type === StepType.Toggle) {
    if (!step.targetEntityId) {
      return;
    }

    const toggleResult = network.toggleEntity(step.targetEntityId);
    if (!toggleResult) {
      return;
    }

    network.refreshConnectivity();

    const statusDetails: EntityStatusChangedEventDetails = {
      entityId: step.targetEntityId,
      entityType: toggleResult.entityType,
      previousEnabled: toggleResult.previousEnabled,
      nextEnabled: toggleResult.nextEnabled,
    };

    eventRecorder.save(
      step.targetEntityId,
      SimulationEventType.SystemEntityStatusChanged,
      statusDetails,
    );
    return;
  }

  if (step.type === StepType.Refresh) {
    const peer = network.getPeer(step.refreshPeerId);
    const module = peer?.getModule(step.refreshProtocol);
    if (!module) {
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.BATMAN &&
      step.refreshAction === RefreshAction.BatmanElp
    ) {
      if (!(module instanceof BatmanModule)) {
        return;
      }
      module.refreshElp();
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.BATMAN &&
      step.refreshAction === RefreshAction.BatmanOgm
    ) {
      if (!(module instanceof BatmanModule)) {
        return;
      }
      // Route aging and stale removals are processed on OGM refresh cadence.
      module.tick();
      module.refreshOgm();
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.DSDV &&
      step.refreshAction === RefreshAction.DsdvFullDump
    ) {
      if (!(module instanceof DsdvModule)) {
        return;
      }

      module.tick();
      module.refreshFullDump();
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.DSDV &&
      step.refreshAction === RefreshAction.DsdvIncremental
    ) {
      if (!(module instanceof DsdvModule)) {
        return;
      }

      module.tick();
      module.refreshIncremental();
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.AODV &&
      step.refreshAction === RefreshAction.AodvHello
    ) {
      if (!(module instanceof AodvModule)) {
        return;
      }

      module.tick();
      module.refreshHello();
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.OLSR &&
      step.refreshAction === RefreshAction.OlsrHello
    ) {
      if (!(module instanceof OlsrModule)) {
        return;
      }

      module.tick();
      module.refreshHello();
      return;
    }

    if (
      step.refreshProtocol === RoutingProtocol.OLSR &&
      step.refreshAction === RefreshAction.OlsrTc
    ) {
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

  if (!step.sourcePeerId || !step.destinationPeerId) {
    return;
  }

  const sourcePeer = network.getPeer(step.sourcePeerId);
  const sourceProtocol = sourcePeer?.getPrimaryProtocol() ?? null;
  const sourceModule = sourceProtocol ? sourcePeer?.getModule(sourceProtocol) : null;
  if (!sourceModule || !isPacketCapableModule(sourceModule)) {
    eventRecorder.save(step.sourcePeerId, SimulationEventType.SystemMessageDropped, {
      reason: sourcePeer
        ? `Source peer does not have a ${sourceProtocol ?? "Unknown"} module`
        : "Source peer does not exist",
      reasonCode: "SOURCE_UNAVAILABLE",
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

const isPacketCapableModule = (module: RoutingProtocolModule): module is PacketCapableModule => {
  return typeof (module as PacketCapableModule).send === "function";
};
