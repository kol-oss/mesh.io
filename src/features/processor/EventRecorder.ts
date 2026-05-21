import { START_TICK } from "@/shared/constants/tick";
import type { Event, EventDetails, EventListener, EventType } from "@/shared/types/common/events";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";

export class EventRecorder {
  private readonly events: Event[] = [];
  private readonly listeners = new Set<EventListener>();

  private currentTick = START_TICK;
  private currentStepId: UUID | null = null;

  setCurrentStep(stepId: UUID | null) {
    this.currentStepId = stepId;
  }

  record(peerId: UUID, type: EventType, details: EventDetails, protocol?: RoutingProtocol) {
    const event: Event = {
      id: generateUUID(),
      tick: this.currentTick,
      stepId: this.currentStepId,
      peerId,
      type,
      protocol,
      details,
    };

    this.events.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  addListener(listener: EventListener) {
    this.listeners.add(listener);
  }

  addTick(ticksNumber = 1) {
    this.currentTick += ticksNumber;
  }

  getEvents() {
    return this.events;
  }

  getCurrentTick() {
    return this.currentTick;
  }
}
