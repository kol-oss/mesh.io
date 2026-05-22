import { getDefaultPeerConfiguration } from "@/shared/constants/protocol";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type {
  AodvConfiguration,
  BatmanConfiguration,
  DsdvConfiguration,
  OlsrConfiguration,
  PeerConfiguration,
} from "@/shared/types/model/configurations";
import { EntityType, type PeerEntity } from "@/shared/types/model/entities";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const sanitizeBatmanConfiguration = (value: unknown): BatmanConfiguration => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.BATMAN) as BatmanConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    penaltyDistance:
      isNumber(value.penaltyDistance) && value.penaltyDistance > 0
        ? value.penaltyDistance
        : defaults.penaltyDistance,
    penaltyPercent:
      isNumber(value.penaltyPercent) && value.penaltyPercent >= 0
        ? value.penaltyPercent
        : defaults.penaltyPercent,
    elpInterval:
      isNumber(value.elpInterval) && value.elpInterval > 0
        ? value.elpInterval
        : defaults.elpInterval,
    ogmInterval:
      isNumber(value.ogmInterval) && value.ogmInterval > 0
        ? value.ogmInterval
        : defaults.ogmInterval,
    purgeTimeout:
      isNumber(value.purgeTimeout) && value.purgeTimeout > 0
        ? value.purgeTimeout
        : defaults.purgeTimeout,
  };
};

const sanitizeDsdvConfiguration = (value: unknown): DsdvConfiguration => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.DSDV) as DsdvConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    incrementalUpdateInterval:
      isNumber(value.incrementalUpdateInterval) && value.incrementalUpdateInterval > 0
        ? value.incrementalUpdateInterval
        : defaults.incrementalUpdateInterval,
    fullDumpInterval:
      isNumber(value.fullDumpInterval) && value.fullDumpInterval > 0
        ? value.fullDumpInterval
        : defaults.fullDumpInterval,
    routeTimeout:
      isNumber(value.routeTimeout) && value.routeTimeout > 0
        ? value.routeTimeout
        : defaults.routeTimeout,
  };
};

const sanitizeAodvConfiguration = (value: unknown): AodvConfiguration => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.AODV) as AodvConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    helloInterval:
      isNumber(value.helloInterval) && value.helloInterval > 0
        ? value.helloInterval
        : defaults.helloInterval,
    routeTimeout:
      isNumber(value.routeTimeout) && value.routeTimeout > 0
        ? value.routeTimeout
        : defaults.routeTimeout,
  };
};

const sanitizeOlsrConfiguration = (value: unknown): OlsrConfiguration => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.OLSR) as OlsrConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    helloInterval:
      isNumber(value.helloInterval) && value.helloInterval > 0
        ? value.helloInterval
        : defaults.helloInterval,
    tcInterval:
      isNumber(value.tcInterval) && value.tcInterval > 0 ? value.tcInterval : defaults.tcInterval,
  };
};

const sanitizePeerConfiguration = (
  protocol: RoutingProtocol,
  configuration: unknown,
): PeerConfiguration => {
  switch (protocol) {
    case RoutingProtocol.BATMAN:
      return sanitizeBatmanConfiguration(configuration);
    case RoutingProtocol.DSDV:
      return sanitizeDsdvConfiguration(configuration);
    case RoutingProtocol.AODV:
      return sanitizeAodvConfiguration(configuration);
    case RoutingProtocol.OLSR:
      return sanitizeOlsrConfiguration(configuration);
    case RoutingProtocol.DSR:
      return {};
  }
};

export const sanitizePeerEntity = (peer: PeerEntity): PeerEntity => {
  const protocol = peer.protocol;

  return {
    id: peer.id,
    name: peer.name,
    type: EntityType.Peer,
    locked: peer.locked,
    x: peer.x,
    y: peer.y,
    range: peer.range,
    enabled: peer.enabled,
    protocol,
    configuration: sanitizePeerConfiguration(protocol, peer.configuration),
  };
};

export const sanitizePeerEntities = (peers: PeerEntity[]): PeerEntity[] => {
  return peers.map(sanitizePeerEntity);
};
