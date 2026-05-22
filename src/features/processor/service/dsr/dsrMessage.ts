import { MessageType, type Message } from "@/shared/types/common/messages";

export const cloneDsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.type === MessageType.DsrRouteRequestMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.type === MessageType.DsrRouteReplyMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.type === MessageType.DsrRouteErrorMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
  };
};

export const isDsrSimulationMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    candidate.type === MessageType.Packet ||
    candidate.type === MessageType.DsrRouteRequestMessage ||
    candidate.type === MessageType.DsrRouteReplyMessage ||
    candidate.type === MessageType.DsrRouteErrorMessage
  );
};
