import { usePropertiesRedux } from "@/features/properties/hooks/usePropertiesRedux";
import Resizer from "@/shared/components/Resizer/Resizer";
import { useSidebarResize } from "@/shared/hooks/useSidebarResize";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import { ResizeSide } from "@/shared/types/view/view";
import type React from "react";
import EntityProperties from "../EntityProperties/EntityProperties";
import StepProperties from "../StepProperties/StepProperties";

type PropertiesProps = {
  isRuntime: boolean;
  isLocked?: boolean;
};

export default function Properties({ isRuntime, isLocked = false }: PropertiesProps) {
  const { id, source, entities, setEntities, steps, setSteps, isCollapsed, isSimulationActive } =
    usePropertiesRedux();
  const { widthPercent, onResizeStart } = useSidebarResize({ side: ResizeSide.Right });
  const isEditingLocked = isLocked || isSimulationActive;

  if (!id || !source || isCollapsed || (isRuntime && source === SelectionSource.Steps)) {
    return null;
  }

  let properties: React.ReactNode = null;
  if (source === SelectionSource.Entities) {
    const entity = entities.find((entity) => entity.id === id);
    if (!entity) {
      return null;
    }

    properties = (
      <EntityProperties
        selected={entity}
        entities={entities}
        setEntities={setEntities}
        isLocked={isEditingLocked}
      />
    );
  } else if (source === SelectionSource.Steps) {
    const step = steps.find((step) => step.id === id);
    if (!step) {
      return null;
    }

    properties = (
      <StepProperties
        step={step}
        steps={steps}
        entities={entities}
        setSteps={setSteps}
        isLocked={isEditingLocked}
      />
    );
  }

  return (
    <>
      <aside
        className={`properties ${isEditingLocked ? "properties--locked" : ""}`}
        style={{ width: `${widthPercent}%` }}
      >
        <Resizer onResizeStart={onResizeStart} side={ResizeSide.Right} />

        {properties}
      </aside>
    </>
  );
}
