import type { Event } from "@/shared/types/processor/events";

export type EventListener = (event: Event) => void;
