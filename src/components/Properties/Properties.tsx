import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import { EntityType, SelectionSource, SidebarResizeSide } from "../../types/enums";
import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";
import LinkProperties from "./LinkProperties";
import ObstacleProperties from "./ObstacleProperties";
import PeerProperties from "./PeerProperties";
import RefreshStepProperties from "./RefreshStepProperties";
import StepProperties from "./StepProperties";

type PropertiesProps = {
  selectedId: string | null;
  selectedSource: SelectionSource | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  isNavCollapsed: boolean;
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

export default function Properties({
  selectedId,
  selectedSource,
  entities,
  setEntities,
  steps,
  setSteps,
  isNavCollapsed,
}: PropertiesProps) {
  const { widthPercent, onResizeStart } = useSidebarResize({ side: SidebarResizeSide.Right });

  if (isNavCollapsed || !selectedId || !selectedSource) {
    return null;
  }

  if (selectedSource === SelectionSource.Steps) {
    const selectedStep = steps.find((step) => step.id === selectedId);
    if (!selectedStep) {
      return null;
    }

    if (isRefreshStep(selectedStep)) {
      const peers = entities.filter(
        (entity): entity is PeerEntity => entity.type === EntityType.Peer,
      );
      return (
        <RefreshStepProperties
          widthPercent={widthPercent}
          onResizeStart={onResizeStart}
          selectedStep={selectedStep}
          peers={peers}
        />
      );
    }

    return (
      <StepProperties
        widthPercent={widthPercent}
        onResizeStart={onResizeStart}
        selectedStep={selectedStep}
        entities={entities}
        steps={steps}
        setSteps={setSteps}
      />
    );
  }

  const selectedEntity = entities.find((entity) => entity.id === selectedId);
  if (!selectedEntity) {
    return null;
  }

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
