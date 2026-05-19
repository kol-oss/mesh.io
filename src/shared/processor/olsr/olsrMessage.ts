import { SimulationMessageKind, type Message } from "@/shared/types/model/simulation";

export const cloneOlsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.kind === SimulationMessageKind.OlsrHelloMessage
      ? {
          neighbours: [...message.neighbours],
          mprPeerIds: [...message.mprPeerIds],
        }
      : {}),
    ...(message.kind === SimulationMessageKind.OlsrTcMessage
      ? {
          advertisedNeighbours: [...message.advertisedNeighbours],
        }
      : {}),
  };
};

export const isOlsrSimulationMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.OlsrHelloMessage ||
    candidate.kind === SimulationMessageKind.OlsrTcMessage
  );
};
