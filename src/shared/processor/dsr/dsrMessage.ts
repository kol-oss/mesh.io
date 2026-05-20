import { MessageType, type Message } from "@/shared/types/model/simulation";

export const cloneDsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.kind === MessageType.DsrRouteRequestMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.kind === MessageType.DsrRouteReplyMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.kind === MessageType.DsrRouteErrorMessage
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
    candidate.kind === MessageType.Packet ||
    candidate.kind === MessageType.DsrRouteRequestMessage ||
    candidate.kind === MessageType.DsrRouteReplyMessage ||
    candidate.kind === MessageType.DsrRouteErrorMessage
  );
};
