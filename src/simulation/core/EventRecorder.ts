import type {
  SimulationEvent,
  SimulationEventDetails,
  SimulationEventType,
} from "../../types/simulation";
import { generateUUID } from "../../utils/uuid";

export class SimulationEventRecorder {
  private readonly events: SimulationEvent[] = [];

  private readonly saveListeners = new Set<(event: SimulationEvent) => void>();

  private currentTick = 1;

  private currentStepId: string | null = null;

  setCurrentStep(stepId: string | null) {
    this.currentStepId = stepId;
  }

  save(peerId: string, type: SimulationEventType, details: SimulationEventDetails) {
    const event: SimulationEvent = {
      id: generateUUID(),
      tick: this.currentTick,
      stepId: this.currentStepId,
      peerId,
      type,
      details,
    };

    this.events.push(event);

    for (const listener of this.saveListeners) {
      listener(event);
    }
  }

  onSave(listener: (event: SimulationEvent) => void) {
    this.saveListeners.add(listener);
    return () => {
      this.saveListeners.delete(listener);
    };
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
