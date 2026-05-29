import type { PeerSnapshot, SimulationResult } from "@/shared/types/common/simulation";
import type { NetworkEntity } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";

export type SimulationWorkerInput = {
  entities: NetworkEntity[];
  manualSteps: Step[];
};

export type RunSimulationWorkerRequest = {
  type: "RUN_SIMULATION";
  payload: SimulationWorkerInput;
};

export type GetStepTablesRequest = {
  type: "GET_STEP_TABLES";
  stepIndex: number;
  // null = end-of-step state; a number = state after that raw event index
  eventIndex: number | null;
};

export type RunSimulationWorkerSuccess = {
  type: "SIMULATION_SUCCESS";
  payload: SimulationResult;
};

export type StepTablesSuccess = {
  type: "STEP_TABLES_SUCCESS";
  stepIndex: number;
  peers: PeerSnapshot[];
};

export type RunSimulationWorkerError = {
  type: "SIMULATION_ERROR";
  error: string;
};

export type SimulationWorkerRequest = RunSimulationWorkerRequest | GetStepTablesRequest;

export type SimulationWorkerResponse =
  | RunSimulationWorkerSuccess
  | StepTablesSuccess
  | RunSimulationWorkerError;
