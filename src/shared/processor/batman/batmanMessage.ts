import { SimulationMessageKind, type Message } from "@/shared/types/model/simulation";

export const cloneMessage = <T extends Message>(message: T): T => {
  return { ...message };
};

export const isSimulationMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.BatmanOriginatorMessage ||
    candidate.kind === SimulationMessageKind.BatmanEchoLocationMessage
  );
};
