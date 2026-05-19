import { SimulationMessageKind, type Message } from "@/shared/types/model/simulation";

export const cloneDsrMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.kind === SimulationMessageKind.DsrRouteRequestMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.kind === SimulationMessageKind.DsrRouteReplyMessage
      ? { routePeerIds: [...message.routePeerIds] }
      : {}),
    ...(message.kind === SimulationMessageKind.DsrRouteErrorMessage
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
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.DsrRouteRequestMessage ||
    candidate.kind === SimulationMessageKind.DsrRouteReplyMessage ||
    candidate.kind === SimulationMessageKind.DsrRouteErrorMessage
  );
};
