import { EntityType } from "../../../types/enums";
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
    title: "Peer",
    description: "A mesh network node with built-in support for specific routing protocols.",
  },
  [EntityType.Link]: {
    title: "Link",
    description: "A persistent bidirectional connection between two nodes in the network.",
  },
  [EntityType.Obstacle]: {
    title: "Obstacle",
    description: "A physical barrier that blocks signal propagation between nearby nodes.",
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
        selectedLink={selectedLink}
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
        selectedObstacle={selectedObstacle}
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
      selectedPeer={selectedPeer}
      entities={entities}
      setEntities={setEntities}
      title={header.title}
      description={header.description}
    />
  );
}
