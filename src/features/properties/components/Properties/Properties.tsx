import { useSidebarResize } from "@/shared/hooks/useSidebarResize";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import { SidebarResizeSide } from "@/shared/types/view/view";
import type { SimulationStepResult } from "@/shared/types/model/simulation";
import { usePropertiesRedux } from "@/features/properties/hooks/usePropertiesRedux";
import EntityProperties from "../EntityProperties/EntityProperties";
import StepProperties from "../StepProperties/StepProperties";

type PropertiesProps = {
  isStepPlacementMode: boolean;
  currentSimulationStepResult: SimulationStepResult | null;
  isEntityReadOnly?: boolean;
};

export default function Properties({
  isStepPlacementMode,
  currentSimulationStepResult,
  isEntityReadOnly = false,
}: PropertiesProps) {
  const { selectedId, selectedSource, entities, setEntities, steps, setSteps, isNavCollapsed } =
    usePropertiesRedux();
  const { widthPercent, onResizeStart } = useSidebarResize({ side: SidebarResizeSide.Right });

  const shouldHideSelection =
    isStepPlacementMode ||
    (currentSimulationStepResult !== null && selectedSource === SelectionSource.Steps);

  const effectiveSelectedId = shouldHideSelection ? null : selectedId;
  const effectiveSelectedSource = shouldHideSelection ? null : selectedSource;

  if (isNavCollapsed || !effectiveSelectedId || !effectiveSelectedSource) {
    return null;
  }

  if (effectiveSelectedSource === SelectionSource.Steps) {
    const selectedStep = steps.find((step) => step.id === effectiveSelectedId);
    if (!selectedStep) {
      return null;
    }

    return (
      <StepProperties
        widthPercent={widthPercent}
        onResizeStart={onResizeStart}
        step={selectedStep}
        entities={entities}
        steps={steps}
        setSteps={setSteps}
      />
    );
  }

  const selectedEntity = entities.find((entity) => entity.id === effectiveSelectedId);
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
