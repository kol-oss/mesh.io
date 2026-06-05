import type { PeerSnapshot, SimulationResult } from "@/shared/types/common/simulation";
import type { NetworkEntity } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";

// input data for compilation
export type CompilationPayload = {
  entities: NetworkEntity[];
  manualSteps: Step[];
};

// type of request sent from main worker to helper
export enum CompilationRequestType {
  Run,
  GetTables,
}

// request to begin the compilation basing on entities and steps
export type RunCompilationRequest = {
  type: CompilationRequestType.Run;
  payload: CompilationPayload;
};

// request to get routing tables for specific step or event
export type GetStepTablesRequest = {
  type: CompilationRequestType.GetTables;
  stepIndex: number;
  eventIndex: number | null;
};

// type of response sent from helper to main worker
export enum CompilationResponseType {
  Success,
  GetTablesSuccess,
  Error,
}

// response that returns states of the system
export type RunCompilationSuccessResponse = {
  type: CompilationResponseType.Success;
  payload: SimulationResult;
};

// response that returns state for specific state
export type StepTablesSuccessResponse = {
  type: CompilationResponseType.GetTablesSuccess;
  stepIndex: number;
  peers: PeerSnapshot[];
};

// response that returns error message
export type RunCompilationErrorResponse = {
  type: CompilationResponseType.Error;
  error: string;
};

export type CompilationRequest = RunCompilationRequest | GetStepTablesRequest;

export type CompilationResponse =
  | RunCompilationSuccessResponse
  | StepTablesSuccessResponse
  | RunCompilationErrorResponse;
