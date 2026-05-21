import { MessageType, type Message } from "@/shared/types/common/messages";

export const cloneAodvMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.kind === MessageType.AodvRouteErrorMessage
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
    candidate.kind === MessageType.Packet ||
    candidate.kind === MessageType.AodvRouteRequestMessage ||
    candidate.kind === MessageType.AodvRouteReplyMessage ||
    candidate.kind === MessageType.AodvRouteErrorMessage ||
    candidate.kind === MessageType.AodvHelloMessage
  );
};
