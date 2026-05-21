import { MessageType, type Message } from "@/shared/types/processor/messages";

export const cloneDsdvMessage = <T extends Message>(message: T): T => {
  return { ...message };
};

export const isDsdvSimulationMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Message>;
  return (
    candidate.kind === MessageType.Packet || candidate.kind === MessageType.DsdvRouteUpdateMessage
  );
};
