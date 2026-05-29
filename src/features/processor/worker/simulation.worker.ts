import { SimulationManager } from "@/features/processor/SimulationManager";
import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "@/features/processor/types/simulationWorker";
import { composeStepsWithRefresh } from "@/shared/utils/navigation/refreshSteps";

// kept alive after RUN_SIMULATION so GET_STEP_TABLES can be served without re-running
let activeManager: SimulationManager | null = null;

self.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const message = event.data;

  if (message.type === "RUN_SIMULATION") {
    activeManager = null;

    try {
      const { entities, manualSteps } = message.payload;
      const steps = composeStepsWithRefresh(manualSteps, entities);

      const manager = SimulationManager.prepare({ entities, steps });
      const result = manager.run();
      activeManager = manager;

      const response: SimulationWorkerResponse = {
        type: "SIMULATION_SUCCESS",
        payload: result,
      };

      self.postMessage(response);
    } catch (error) {
      const response: SimulationWorkerResponse = {
        type: "SIMULATION_ERROR",
        error: error instanceof Error ? error.message : "Simulation failed",
      };

      self.postMessage(response);
    }

    return;
  }

  if (message.type === "GET_STEP_TABLES") {
    const { stepIndex, eventIndex } = message;
    const peers =
      eventIndex !== null
        ? (activeManager?.getEventPeerTables(stepIndex, eventIndex) ?? [])
        : (activeManager?.getStepPeerTables(stepIndex) ?? []);

    const response: SimulationWorkerResponse = {
      type: "STEP_TABLES_SUCCESS",
      stepIndex: message.stepIndex,
      peers,
    };

    self.postMessage(response);
  }
};

export {};
