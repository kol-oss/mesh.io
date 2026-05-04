import { EntityType, RoutingProtocol } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import { generateUUID } from "../uuid";

export const peerDefaults = {
  x: 300,
  y: 100,
  range: 150,
  enabled: true,
  protocols: [RoutingProtocol.BATMAN],
  batmanDistancePenaltyDistance: 75,
  batmanDistancePenaltyPercent: 5,
  batmanElpInterval: 1,
  batmanOgmInterval: 1,
  batmanPurgeTimeout: 10,
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

const normalizePeerProtocols = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [...peerDefaults.protocols];
  }

  const firstValidProtocol = value.find((item): item is RoutingProtocol =>
    validProtocols.includes(item as RoutingProtocol),
  );

  return firstValidProtocol ? [firstValidProtocol] : [...peerDefaults.protocols];
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
    Array.isArray(entity.protocols) &&
    entity.protocols.length === 1 &&
    validProtocols.includes(entity.protocols[0]) &&
    typeof entity.batmanDistancePenaltyDistance === "number" &&
    entity.batmanDistancePenaltyDistance > 0 &&
    typeof entity.batmanDistancePenaltyPercent === "number" &&
    entity.batmanDistancePenaltyPercent >= 0 &&
    typeof entity.batmanElpInterval === "number" &&
    typeof entity.batmanOgmInterval === "number" &&
    typeof entity.batmanPurgeTimeout === "number"
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

export const migrateEntities = (entities: NetworkEntity[]) => {
  const requiresMigration = entities.some((entity) => {
    const normalizedType = (entity as NetworkEntity | { type: string }).type;
    const hasId = "id" in entity;
    return (
      normalizedType === "ROUTER" ||
      !hasPeerDefaults(entity) ||
      !hasLinkDefaults(entity) ||
      !hasObstacleDefaults(entity) ||
      !hasId
    );
  });

  if (!requiresMigration) {
    return null;
  }

  return entities.map((entity) => {
    const normalizedType = (entity as NetworkEntity | { type: string }).type;
    const baseEntity = {
      ...entity,
      id: "id" in entity ? entity.id : generateUUID(),
    };

    if (normalizedType === "ROUTER") {
      return {
        ...baseEntity,
        type: EntityType.Peer,
        ...peerDefaults,
      };
    }

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

      return baseEntity;
    }

    return {
      ...peerDefaults,
      ...baseEntity,
      type: EntityType.Peer,
      protocols: normalizePeerProtocols(entity.protocols),
    };
  });
};
