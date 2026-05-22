import { MessageType, type Message } from "@/shared/types/common/messages";

export const cloneAodvMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.type === MessageType.AodvRouteErrorMessage
      ? {
          unreachableDestinations: message.unreachableDestinations.map((entry) => ({ ...entry })),
        }
      : {}),
  };
};

export const isAodvSimulationMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    candidate.type === MessageType.Packet ||
    candidate.type === MessageType.AodvRouteRequestMessage ||
    candidate.type === MessageType.AodvRouteReplyMessage ||
    candidate.type === MessageType.AodvRouteErrorMessage ||
    candidate.type === MessageType.AodvHelloMessage
  );
};
