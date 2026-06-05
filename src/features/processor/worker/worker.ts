import { SimulationManager } from "@/features/processor/SimulationManager";
import {
  type CompilationRequest,
  CompilationRequestType,
  type CompilationResponse,
  CompilationResponseType,
} from "@/features/processor/types/worker.ts";
import { composeStepsWithRefresh } from "@/shared/utils/navigation/refreshSteps";

let activeManager: SimulationManager | null = null;

self.onmessage = (event: MessageEvent<CompilationRequest>) => {
  const message = event.data;
  const { type: messageType } = message;

  // processing of Run compilation request
  if (messageType === CompilationRequestType.Run) {
    activeManager = null;

    try {
      const { entities, manualSteps } = message.payload;
      const steps = composeStepsWithRefresh(manualSteps, entities);

      const manager = SimulationManager.prepare({ entities, steps });
      const result = manager.run();
      activeManager = manager;

      const response: CompilationResponse = {
        type: CompilationResponseType.Success,
        payload: result,
      };

      self.postMessage(response);
    } catch (error) {
      const response: CompilationResponse = {
        type: CompilationResponseType.Error,
        error: error instanceof Error ? error.message : "Simulation failed",
      };

      self.postMessage(response);
    }

    return;
  }

  // processing of GetTables compilation request
  if (messageType === CompilationRequestType.GetTables) {
    const { stepIndex, eventIndex } = message;
    const peers =
      eventIndex !== null
        ? (activeManager?.getTablesAtEvent(stepIndex, eventIndex) ?? [])
        : (activeManager?.getStepTables(stepIndex) ?? []);

    const response: CompilationResponse = {
      type: CompilationResponseType.GetTablesSuccess,
      stepIndex: message.stepIndex,
      peers,
    };

    self.postMessage(response);
  }
};

export {};
