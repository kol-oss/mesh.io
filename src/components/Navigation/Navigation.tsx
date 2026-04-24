import { useState } from "react";
import EntityList from "../EntityList/EntityList";
import StepsList from "../StepsList/StepsList";
import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import type { NetworkEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import NavigationHeader from "./NavigationHeader";
import NavigationMenu from "./NavigationMenu";

type NavigationProps = {
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  onEntitySelect: (id: string) => void;
  onStepSelect: (id: string) => void;
  onClearSelection: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Navigation({
  selectedId,
  selectedSource,
  entities,
  setEntities,
  steps,
  setSteps,
  onEntitySelect,
  onStepSelect,
  onClearSelection,
  isCollapsed,
  onToggleCollapse,
}: NavigationProps) {
  const { widthPercent, onResizeStart } = useSidebarResize();

  return (
    <aside
      className={`navigation ${isCollapsed ? "navigation--collapsed" : ""}`}
      style={isCollapsed ? undefined : { width: `${widthPercent}%` }}
    >
      <NavigationHeader isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
      {!isCollapsed && (
        <>
          <NavigationMenu />
          <div className="navigation__lists">
            <EntityList
              entities={entities}
              setEntities={setEntities}
              selectedId={selectedSource === "entities" ? selectedId : null}
              onSelect={onEntitySelect}
              onClearSelection={onClearSelection}
            />
            <StepsList
              steps={steps}
              setSteps={setSteps}
              selectedId={selectedSource === "steps" ? selectedId : null}
              onSelect={onStepSelect}
              onClearSelection={onClearSelection}
            />
          </div>
          <div
            className="navigation__resizer"
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            onPointerDown={onResizeStart}
          />
        </>
      )}
    </aside>
  );
}
