import { SimulationMessageKind, type Message } from "@/shared/types/model/simulation";

export const cloneAodvMessage = <T extends Message>(message: T): T => {
  return {
    ...message,
    ...(message.kind === SimulationMessageKind.AodvRouteErrorMessage
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
    candidate.kind === SimulationMessageKind.Packet ||
    candidate.kind === SimulationMessageKind.AodvRouteRequestMessage ||
    candidate.kind === SimulationMessageKind.AodvRouteReplyMessage ||
    candidate.kind === SimulationMessageKind.AodvRouteErrorMessage ||
    candidate.kind === SimulationMessageKind.AodvHelloMessage
  );
};
