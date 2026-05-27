import type { Message } from "@/shared/types/common/messages";

export const clone = <T extends Message>(message: T): T => {
  return { ...message };
};
