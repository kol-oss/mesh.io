import type {
  SimulationEvent,
  SimulationEventDetails,
  SimulationEventType,
} from "../../types/simulation";
import { generateUUID } from "../../utils/uuid";

export class SimulationEventRecorder {
  private readonly events: SimulationEvent[] = [];

  private currentTick = 1;

  private currentStepId: string | null = null;

  setCurrentStep(stepId: string | null) {
    this.currentStepId = stepId;
  }

  save(peerId: string, type: SimulationEventType, details: SimulationEventDetails) {
    this.events.push({
      id: generateUUID(),
      tick: this.currentTick,
      stepId: this.currentStepId,
      peerId,
      type,
      details,
    });
  }

  addTick(ticksNumber = 1) {
    this.currentTick += ticksNumber;
  }

  getCurrentTick() {
    return this.currentTick;
  }

  getEvents() {
    return this.events;
  }
}
