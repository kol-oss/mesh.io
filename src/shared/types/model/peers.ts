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
