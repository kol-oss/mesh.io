import { SimulationMessageKind, type SimulationMessage } from "@/shared/types/model/simulation";

export const cloneDsrMessage = <T extends SimulationMessage>(message: T): T => {
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

export const isDsrSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.DsrRouteRequestMessage ||
    candidate.kind === SimulationMessageKind.DsrRouteReplyMessage ||
    candidate.kind === SimulationMessageKind.DsrRouteErrorMessage
  );
};
