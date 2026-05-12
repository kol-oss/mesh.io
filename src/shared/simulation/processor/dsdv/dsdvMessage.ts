import { SimulationMessageKind, type SimulationMessage } from "../../types/simulation";

export const cloneDsdvMessage = <T extends SimulationMessage>(message: T): T => {
  return { ...message };
};

export const isDsdvSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.DsdvRouteUpdateMessage
  );
};
