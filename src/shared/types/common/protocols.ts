export enum RoutingProtocol {
  DSDV = "DSDV",
  BATMAN = "BATMAN",
  OLSR = "OLSR",
  AODV = "AODV",
  DSR = "DSR",
}

export const ROUTING_PROTOCOLS: RoutingProtocol[] = [
  RoutingProtocol.DSDV,
  RoutingProtocol.BATMAN,
  RoutingProtocol.OLSR,
  RoutingProtocol.AODV,
  RoutingProtocol.DSR,
];
