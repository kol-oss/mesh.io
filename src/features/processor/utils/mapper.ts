import type { Coordinate } from "@/shared/types/model/base";
import { EntityType } from "@/shared/types/model/entities";
import type { PeerEntity } from "@/shared/types/model/peers";
import type { RoutingModule } from "../types/module";
import type { Peer } from "../types/network/peer";

export const mapEntityToNode = (entity: PeerEntity, module: RoutingModule): Peer => {
  const { id, name, protocol, range, configuration, x, y, enabled } = entity;
  return {
    id: id,
    name: name,
    active: enabled,
    configuration: configuration,
    coordinates: { x: x, y: y } as Coordinate,
    range: range,
    protocol: protocol,
    module: module,
  } satisfies Peer;
};

export const mapNodeToEntity = (node: Peer): PeerEntity => {
  const { id, name, protocol, range, configuration, coordinates, active } = node;
  return {
    id: id,
    name: name,
    type: EntityType.Peer,
    protocol: protocol,
    range: range,
    configuration: configuration,
    x: coordinates.x,
    y: coordinates.y,
    enabled: active,
  } satisfies PeerEntity;
};
