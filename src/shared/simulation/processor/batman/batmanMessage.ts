import { SimulationMessageKind, type SimulationMessage } from "../../types/simulation";

export const cloneMessage = <T extends SimulationMessage>(message: T): T => {
  return { ...message };
};

export const isSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.BatmanOriginatorMessage ||
    candidate.kind === SimulationMessageKind.BatmanEchoLocationMessage
  );
};
