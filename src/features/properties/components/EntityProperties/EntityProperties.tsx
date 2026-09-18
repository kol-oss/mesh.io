import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import LinkProperties from "../LinkProperties/LinkProperties";
import ObstacleProperties from "../ObstacleProperties/ObstacleProperties";
import PeerProperties from "../PeerProperties/PeerProperties";

type EntityPropertiesProps = {
  selected: NetworkEntity;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  isLocked?: boolean;
};

export default function EntityProperties({
  selected,
  entities,
  setEntities,
  isLocked = false,
}: EntityPropertiesProps) {
  const { type } = selected;
  return (
    <>
      {type === EntityType.Peer && (
        <PeerProperties
          selected={selected as PeerEntity}
          entities={entities}
          setEntities={setEntities}
          isLocked={isLocked}
        />
      )}

      {type === EntityType.Link && (
        <LinkProperties
          selected={selected as LinkEntity}
          entities={entities}
          setEntities={setEntities}
          isLocked={isLocked}
        />
      )}

      {type === EntityType.Obstacle && (
        <ObstacleProperties
          selected={selected as ObstacleEntity}
          entities={entities}
          setEntities={setEntities}
          isLocked={isLocked}
        />
      )}
    </>
  );
}
