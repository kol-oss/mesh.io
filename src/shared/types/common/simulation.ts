import type { ProtocolTables } from "@/features/processor/types/peerTables";
import type { UUID } from "@/shared/types/common/uuid.ts";
import type { NetworkEntity } from "../model/entities";
import type { Step } from "../model/steps";
import type { Event } from "./events";

export type PeerSnapshot = {
  peerId: UUID;
  tables: ProtocolTables;
};

export type Snapshot = {
  tick: number;
  entities: NetworkEntity[];
};

export type StepResult = {
  step: Step;
  events: Event[];
  snapshot: Snapshot;
};

export type SimulationInput = {
  entities: NetworkEntity[];
  steps: Step[];
};

export type SimulationResult = {
  events: Event[];
  steps: Step[];
  stepResults: StepResult[];
};
