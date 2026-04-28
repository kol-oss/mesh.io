import EntityList from "../EntityList/EntityList";
import StepsList from "../StepsList/StepsList";
import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import { SelectionSource } from "../../types/enums";
import type { NetworkEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import NavigationHeader from "./NavigationHeader";
import NavigationMenu from "./NavigationMenu";

type NavigationProps = {
  selectedId: string | null;
  selectedSource: SelectionSource | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  onEntitySelect: (id: string) => void;
  onStepSelect: (id: string) => void;
  onClearSelection: () => void;
  onFileNew: () => void;
  onFileExport: () => void;
  onFileImport: (file: File) => void | Promise<void>;
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
  onFileNew,
  onFileExport,
  onFileImport,
  isCollapsed,
  onToggleCollapse,
}: NavigationProps) {
  const { widthPercent, onResizeStart } = useSidebarResize();

  return (
    <aside
      className={`navigation ${isCollapsed ? "navigation--collapsed" : ""}`}
      style={isCollapsed ? undefined : { width: `${widthPercent}%` }}
    >
      <NavigationHeader
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onFileNew={onFileNew}
        onFileExport={onFileExport}
        onFileImport={onFileImport}
      />
      {!isCollapsed && (
        <>
          <NavigationMenu onNew={onFileNew} onExport={onFileExport} onImport={onFileImport} />
          <div className="navigation__lists">
            <EntityList
              entities={entities}
              setEntities={setEntities}
              selectedId={selectedSource === SelectionSource.Entities ? selectedId : null}
              onSelect={onEntitySelect}
              onClearSelection={onClearSelection}
            />
            <StepsList
              steps={steps}
              setSteps={setSteps}
              selectedId={selectedSource === SelectionSource.Steps ? selectedId : null}
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
