export const RoutingProtocol = {
  DSDV: "DSDV",
  BATMAN: "BATMAN",
  OLSR: "OLSR",
  AODV: "AODV",
  DSR: "DSR",
} as const;

export type RoutingProtocol = (typeof RoutingProtocol)[keyof typeof RoutingProtocol];

export type PeerRoutingProtocol = RoutingProtocol;
