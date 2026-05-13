import { SimulationMessageKind, type SimulationMessage } from "../../../types/model/simulation";

export const cloneOlsrMessage = <T extends SimulationMessage>(message: T): T => {
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

export const isOlsrSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.OlsrHelloMessage ||
    candidate.kind === SimulationMessageKind.OlsrTcMessage
  );
};
