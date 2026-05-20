import { MessageType, type Message } from "@/shared/types/model/simulation";

export const cloneOlsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.kind === MessageType.OlsrHelloMessage
      ? {
          neighbours: [...message.neighbours],
          mprPeerIds: [...message.mprPeerIds],
        }
      : {}),
    ...(message.kind === MessageType.OlsrTcMessage
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
    candidate.kind === MessageType.Packet ||
    candidate.kind === MessageType.OlsrHelloMessage ||
    candidate.kind === MessageType.OlsrTcMessage
  );
};
