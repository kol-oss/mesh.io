import type { BaseEntity, Coordinate } from "./base";
import type {
  AodvConfiguration,
  BatmanConfiguration,
  DsdvConfiguration,
  DsrConfiguration,
  OlsrConfiguration,
  PeerConfiguration,
} from "./configurations";
import { EntityType } from "./entities";
import { RoutingProtocol } from "@/shared/types/common/protocols";

export interface PeerEntity extends BaseEntity, Coordinate {
  type: EntityType.Peer;
  range: number;
  enabled: boolean;
  protocol: RoutingProtocol;
  configuration: PeerConfiguration;
}

export const getConfiguration = (peer: PeerEntity): PeerConfiguration => {
  switch (peer.protocol) {
    case RoutingProtocol.BATMAN:
      return peer.configuration as BatmanConfiguration;
    case RoutingProtocol.DSDV:
      return peer.configuration as DsdvConfiguration;
    case RoutingProtocol.AODV:
      return peer.configuration as AodvConfiguration;
    case RoutingProtocol.OLSR:
      return peer.configuration as OlsrConfiguration;
    case RoutingProtocol.DSR:
      return peer.configuration as DsrConfiguration;
    default:
      return {} as PeerConfiguration;
  }
};

export const getBatmanConfiguration = (peer: PeerEntity): BatmanConfiguration | null => {
  return peer.protocol === RoutingProtocol.BATMAN
    ? (peer.configuration as BatmanConfiguration)
    : null;
};

export const getDsdvConfiguration = (peer: PeerEntity): DsdvConfiguration | null => {
  return peer.protocol === RoutingProtocol.DSDV ? (peer.configuration as DsdvConfiguration) : null;
};

export const getAodvConfiguration = (peer: PeerEntity): AodvConfiguration | null => {
  return peer.protocol === RoutingProtocol.AODV ? (peer.configuration as AodvConfiguration) : null;
};

export const getOlsrConfiguration = (peer: PeerEntity): OlsrConfiguration | null => {
  return peer.protocol === RoutingProtocol.OLSR ? (peer.configuration as OlsrConfiguration) : null;
};

export const getDsrConfiguration = (peer: PeerEntity): DsrConfiguration | null => {
  return peer.protocol === RoutingProtocol.DSR ? (peer.configuration as DsrConfiguration) : null;
};
