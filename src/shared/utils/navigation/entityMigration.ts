import { getDefaultPeerConfiguration } from "@/shared/constants/protocols/protocol";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID } from "@/shared/types/common/uuid";
import type {
  AodvConfiguration,
  BatmanConfiguration,
  DsdvConfiguration,
  OlsrConfiguration,
  PeerConfiguration,
} from "@/shared/types/model/configurations";
import type { NetworkEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import { sanitizePeerEntity } from "@/shared/utils/entities/sanitizers";

export const peerDefaults = {
  x: 300,
  y: 100,
  range: 150,
  enabled: true,
  protocol: RoutingProtocol.BATMAN,
  configuration: getDefaultPeerConfiguration(RoutingProtocol.BATMAN),
};

export const linkDefaults = {
  sourcePeerId: null,
  destinationPeerId: null,
  enabled: true,
};

export const obstacleDefaults = {
  x: 200,
  y: 200,
  width: 100,
  height: 60,
};

const validProtocols = Object.values(RoutingProtocol);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizePeerProtocol = (value: unknown): RoutingProtocol => {
  if (typeof value === "string" && validProtocols.includes(value as RoutingProtocol)) {
    return value as RoutingProtocol;
  }

  return peerDefaults.protocol;
};

const normalizeBatmanConfiguration = (value: unknown) => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.BATMAN) as BatmanConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    penaltyDistance:
      typeof value.penaltyDistance === "number" && value.penaltyDistance > 0
        ? value.penaltyDistance
        : defaults.penaltyDistance,
    penaltyPercent:
      typeof value.penaltyPercent === "number" && value.penaltyPercent >= 0
        ? value.penaltyPercent
        : defaults.penaltyPercent,
    elpInterval:
      typeof value.elpInterval === "number" && value.elpInterval > 0
        ? value.elpInterval
        : defaults.elpInterval,
    ogmInterval:
      typeof value.ogmInterval === "number" && value.ogmInterval > 0
        ? value.ogmInterval
        : defaults.ogmInterval,
    purgeTimeout:
      typeof value.purgeTimeout === "number" && value.purgeTimeout > 0
        ? value.purgeTimeout
        : defaults.purgeTimeout,
  };
};

const normalizeDsdvConfiguration = (value: unknown) => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.DSDV) as DsdvConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    incrementalUpdateInterval:
      typeof value.incrementalUpdateInterval === "number" && value.incrementalUpdateInterval > 0
        ? value.incrementalUpdateInterval
        : defaults.incrementalUpdateInterval,
    fullDumpInterval:
      typeof value.fullDumpInterval === "number" && value.fullDumpInterval > 0
        ? value.fullDumpInterval
        : defaults.fullDumpInterval,
    routeTimeout:
      typeof value.routeTimeout === "number" && value.routeTimeout > 0
        ? value.routeTimeout
        : defaults.routeTimeout,
  };
};

const normalizeAodvConfiguration = (value: unknown) => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.AODV) as AodvConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    helloInterval:
      typeof value.helloInterval === "number" && value.helloInterval > 0
        ? value.helloInterval
        : defaults.helloInterval,
    routeTimeout:
      typeof value.routeTimeout === "number" && value.routeTimeout > 0
        ? value.routeTimeout
        : defaults.routeTimeout,
  };
};

const normalizeOlsrConfiguration = (value: unknown) => {
  const defaults = getDefaultPeerConfiguration(RoutingProtocol.OLSR) as OlsrConfiguration;
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    helloInterval:
      typeof value.helloInterval === "number" && value.helloInterval > 0
        ? value.helloInterval
        : defaults.helloInterval,
    tcInterval:
      typeof value.tcInterval === "number" && value.tcInterval > 0
        ? value.tcInterval
        : defaults.tcInterval,
  };
};

const normalizePeerConfiguration = (
  value: unknown,
  protocol: RoutingProtocol,
): PeerConfiguration => {
  if (protocol === RoutingProtocol.BATMAN) {
    return normalizeBatmanConfiguration(value);
  }

  if (protocol === RoutingProtocol.DSDV) {
    return normalizeDsdvConfiguration(value);
  }

  if (protocol === RoutingProtocol.AODV) {
    return normalizeAodvConfiguration(value);
  }

  if (protocol === RoutingProtocol.OLSR) {
    return normalizeOlsrConfiguration(value);
  }

  return {} as Record<string, never>;
};

const hasPeerDefaults = (entity: NetworkEntity) => {
  if (entity.type !== EntityType.Peer) {
    return true;
  }

  return (
    typeof entity.x === "number" &&
    typeof entity.y === "number" &&
    typeof entity.range === "number" &&
    entity.range > 0 &&
    typeof entity.enabled === "boolean" &&
    validProtocols.includes(entity.protocol) &&
    isRecord(entity.configuration)
  );
};

const hasLinkDefaults = (entity: NetworkEntity) => {
  if (entity.type !== EntityType.Link) {
    return true;
  }

  return (
    (entity.sourcePeerId === null || typeof entity.sourcePeerId === "string") &&
    (entity.destinationPeerId === null || typeof entity.destinationPeerId === "string") &&
    typeof entity.enabled === "boolean"
  );
};

const hasObstacleDefaults = (entity: NetworkEntity) => {
  if (entity.type !== EntityType.Obstacle) {
    return true;
  }

  return (
    typeof entity.x === "number" &&
    typeof entity.y === "number" &&
    typeof entity.width === "number" &&
    Number.isFinite(entity.width) &&
    entity.width > 0 &&
    typeof entity.height === "number" &&
    Number.isFinite(entity.height) &&
    entity.height > 0
  );
};

export const migrateEntities = (entities: NetworkEntity[]): NetworkEntity[] | null => {
  const requiresMigration = entities.some((entity) => {
    const hasId = "id" in entity;
    return (
      !hasPeerDefaults(entity) || !hasLinkDefaults(entity) || !hasObstacleDefaults(entity) || !hasId
    );
  });

  if (!requiresMigration) {
    return null;
  }

  return entities.map((entity) => {
    const entityRecord = entity as unknown as Record<string, unknown>;
    const baseEntity = {
      ...entity,
      id: "id" in entity ? entity.id : generateUUID(),
    };

    if (entity.type !== EntityType.Peer) {
      if (entity.type === EntityType.Link) {
        return {
          ...linkDefaults,
          ...baseEntity,
          type: EntityType.Link,
        };
      }

      if (entity.type === EntityType.Obstacle) {
        const nextWidth =
          typeof entity.width === "number" && entity.width > 0
            ? entity.width
            : obstacleDefaults.width;
        const nextHeight =
          typeof entity.height === "number" && entity.height > 0
            ? entity.height
            : obstacleDefaults.height;

        return {
          ...obstacleDefaults,
          ...baseEntity,
          type: EntityType.Obstacle,
          width: nextWidth,
          height: nextHeight,
        };
      }

      return baseEntity as NetworkEntity;
    }

    const protocol = normalizePeerProtocol(entityRecord.protocol);

    return sanitizePeerEntity({
      ...peerDefaults,
      ...baseEntity,
      type: EntityType.Peer,
      protocol,
      configuration: normalizePeerConfiguration(entityRecord.configuration, protocol),
    });
  });
};
