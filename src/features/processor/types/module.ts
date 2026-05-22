import type { Packet } from "@/shared/types/common/messages";

export interface RoutingModule {
  read(message: unknown): boolean;
  send(packet: Packet): boolean;
  refresh(): void;
  tick(): void;
}
