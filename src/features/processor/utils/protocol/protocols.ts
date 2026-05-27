import { RoutingProtocol } from "@/shared/types/common/protocols";

export const isReactive = (protocol: RoutingProtocol): boolean => {
  return protocol === RoutingProtocol.DSR || protocol === RoutingProtocol.AODV;
};
