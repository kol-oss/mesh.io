import type { Event, EventDetails, EventListener, EventType } from "@/shared/types/common/events";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { Step } from "@/shared/types/model/steps";

export interface EventRecorder {
  record(peerId: UUID, type: EventType, details: EventDetails, protocol?: RoutingProtocol): void;
  setStep(step: Step | null): void;
  setListener(listener: EventListener): void;
  getEvents(): Event[];
  getCurrentTick(): number;
}
