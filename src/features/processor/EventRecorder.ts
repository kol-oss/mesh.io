import type { Event, EventDetails, EventListener, EventType } from "@/shared/types/common/events";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import type { Step } from "@/shared/types/model/steps";
import type { EventRecorder } from "./types/recorder";

export class EventRecorderImpl implements EventRecorder {
  private readonly events: Event[] = [];
  private listener: EventListener | null = null;

  private currentStep: Step | null = null;

  record(peerId: UUID, type: EventType, details: EventDetails, protocol?: RoutingProtocol) {
    if (!this.currentStep) {
      throw new Error("Can not record event without step context");
    }

    const { id: stepId, tick } = this.currentStep;
    const event: Event = {
      id: generateUUID(),
      tick,
      stepId,
      peerId,
      type,
      protocol,
      details,
    };

    this.events.push(event);
    if (this.listener) {
      this.listener(event);
    }
  }

  setStep(step: Step | null) {
    this.currentStep = step;
  }

  setListener(listener: EventListener) {
    this.listener = listener;
  }

  getEvents() {
    return this.events;
  }

  getCurrentTick() {
    return this.currentStep ? this.currentStep.tick : Number.NEGATIVE_INFINITY;
  }
}
