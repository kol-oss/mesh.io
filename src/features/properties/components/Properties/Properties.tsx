import { usePropertiesRedux } from "@/features/properties/hooks/usePropertiesRedux";
import { useSidebarResize } from "@/shared/hooks/useSidebarResize";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import { SidebarResizeSide } from "@/shared/types/view/view";
import type React from "react";
import EntityProperties from "../EntityProperties/EntityProperties";
import StepProperties from "../StepProperties/StepProperties";

type PropertiesProps = {
  isRuntime: boolean;
  isLocked?: boolean;
};

export default function Properties({ isRuntime: isRuntime, isLocked = false }: PropertiesProps) {
  const {
    selectedId: id,
    selectedSource: source,
    entities,
    setEntities,
    steps,
    setSteps,
    isNavCollapsed: collapsed,
  } = usePropertiesRedux();
  const { widthPercent, onResizeStart } = useSidebarResize({ side: SidebarResizeSide.Right });

  if (!id || !source || collapsed || (isRuntime && source === SelectionSource.Steps)) {
    return null;
  }

  let properties: React.ReactNode = null;
  if (source === SelectionSource.Entities) {
    const entity = entities.find((entity) => entity.id === id);
    if (!entity) {
      return null;
    }

    properties = (
      <EntityProperties selected={entity} entities={entities} setEntities={setEntities} />
    );
  } else if (source === SelectionSource.Steps) {
    const step = steps.find((step) => step.id === id);
    if (!step) {
      return null;
    }

    properties = (
      <StepProperties step={step} steps={steps} entities={entities} setSteps={setSteps} />
    );
  }

  return (
    <>
      <aside
        className={`properties ${isLocked ? "properties--locked" : ""}`}
        style={{ width: `${widthPercent}%` }}
      >
        <div
          className="properties__resizer"
          role="separator"
          aria-label={"Resize properties"}
          aria-orientation="vertical"
          onPointerDown={onResizeStart}
        />

        {properties}
      </aside>
    </>
  );
}
