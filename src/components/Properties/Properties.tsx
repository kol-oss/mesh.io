import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import { SelectionSource, SidebarResizeSide } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import type { WorkflowStep } from "../../types/steps";
import EntityProperties from "./entity/EntityProperties";
import StepProperties from "./step/StepProperties";

type PropertiesProps = {
  selectedId: string | null;
  selectedSource: SelectionSource | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  isNavCollapsed: boolean;
  isEntityReadOnly?: boolean;
};

export default function Properties({
  selectedId,
  selectedSource,
  entities,
  setEntities,
  steps,
  setSteps,
  isNavCollapsed,
  isEntityReadOnly = false,
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

  const effectiveSelectedEntity = isEntityReadOnly
    ? {
        ...selectedEntity,
        locked: true,
      }
    : selectedEntity;

  return (
    <EntityProperties
      widthPercent={widthPercent}
      onResizeStart={onResizeStart}
      selectedEntity={effectiveSelectedEntity}
      entities={entities}
      setEntities={setEntities}
    />
  );
}
