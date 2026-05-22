import { MessageType, type Message } from "@/shared/types/common/messages";

export const cloneOlsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.type === MessageType.OlsrHelloMessage
      ? {
          neighbours: [...message.neighbours],
          mprPeerIds: [...message.mprPeerIds],
        }
      : {}),
    ...(message.type === MessageType.OlsrTcMessage
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
    candidate.type === MessageType.Packet ||
    candidate.type === MessageType.OlsrHelloMessage ||
    candidate.type === MessageType.OlsrTcMessage
  );
};
