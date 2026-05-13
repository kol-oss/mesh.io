import { SimulationMessageKind, type SimulationMessage } from "../../../types/model/simulation";

export const cloneAodvMessage = <T extends SimulationMessage>(message: T): T => {
  return {
    ...message,
    ...(message.kind === SimulationMessageKind.AodvRouteErrorMessage
      ? {
          unreachableDestinations: message.unreachableDestinations.map((entry) => ({ ...entry })),
        }
      : {}),
  };
};

export const isAodvSimulationMessage = (value: unknown): value is SimulationMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulationMessage>;
  return (
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.AodvRouteRequestMessage ||
    candidate.kind === SimulationMessageKind.AodvRouteReplyMessage ||
    candidate.kind === SimulationMessageKind.AodvRouteErrorMessage ||
    candidate.kind === SimulationMessageKind.AodvHelloMessage
  );
};
