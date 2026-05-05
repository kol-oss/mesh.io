import { EntityType } from "../../../types/enums";
import { ui } from "../../../i18n/messages";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "../../../types/entities";
import type { PropertiesResizeHandler } from "../../../types/properties";
import LinkProperties from "./LinkProperties";
import ObstacleProperties from "./ObstacleProperties";
import PeerProperties from "./PeerProperties";

type EntityPropertiesProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedEntity: NetworkEntity;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
};

const entityHeader: Record<NetworkEntity["type"], { title: string; description: string }> = {
  [EntityType.Peer]: {
    title: ui.properties.peerTitle,
    description: ui.properties.peerDescription,
  },
  [EntityType.Link]: {
    title: ui.properties.linkTitle,
    description: ui.properties.linkDescription,
  },
  [EntityType.Obstacle]: {
    title: ui.properties.obstacleTitle,
    description: ui.properties.obstacleDescription,
  },
};

export default function EntityProperties({
  widthPercent,
  onResizeStart,
  selectedEntity,
  entities,
  setEntities,
}: EntityPropertiesProps) {
  const header = entityHeader[selectedEntity.type];

  if (selectedEntity.type === EntityType.Link) {
    const selectedLink: LinkEntity = selectedEntity;
    return (
      <LinkProperties
        widthPercent={widthPercent}
        onResizeStart={onResizeStart}
        selected={selectedLink}
        entities={entities}
        setEntities={setEntities}
        title={header.title}
        description={header.description}
      />
    );
  }

  if (selectedEntity.type === EntityType.Obstacle) {
    const selectedObstacle: ObstacleEntity = selectedEntity;
    return (
      <ObstacleProperties
        widthPercent={widthPercent}
        onResizeStart={onResizeStart}
        selected={selectedObstacle}
        entities={entities}
        setEntities={setEntities}
        title={header.title}
        description={header.description}
      />
    );
  }

  const selectedPeer: PeerEntity = selectedEntity;
  return (
    <PeerProperties
      widthPercent={widthPercent}
      onResizeStart={onResizeStart}
      selected={selectedPeer}
      entities={entities}
      setEntities={setEntities}
      title={header.title}
      description={header.description}
    />
  );
}
