import Entities from "@/features/navigation/components/Entities/Entities";
import Steps from "@/features/navigation/components/Steps/Steps";
import { useSidebarResize } from "@/shared/hooks/useSidebarResize";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type { NetworkEntity } from "@/shared/types/model/entities";
import type { WorkflowStep } from "@/shared/types/model/steps";
import type { UUID } from "@/shared/types/common/uuid";
import NavigationHeader from "../NavigationHeader/NavigationHeader";
import NavigationMenu from "../NavigationMenu/NavigationMenu";

type NavigationProps = {
  selectedId: UUID | null;
  selectedSource: SelectionSource | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  onEntitySelect: (id: UUID) => void;
  onStepSelect: (id: UUID) => void;
  onClearSelection: () => void;
  entitiesOpened: boolean;
  onEntitiesOpenedChange: (opened: boolean) => void;
  stepsOpened: boolean;
  onStepsOpenedChange: (opened: boolean) => void;
  stepsRefreshHidden: boolean;
  onStepsRefreshHiddenChange: (hidden: boolean) => void;
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
  entitiesOpened,
  onEntitiesOpenedChange,
  stepsOpened,
  onStepsOpenedChange,
  stepsRefreshHidden,
  onStepsRefreshHiddenChange,
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
            <Entities
              entities={entities}
              setEntities={setEntities}
              selectedId={selectedSource === SelectionSource.Entities ? selectedId : null}
              isOpened={entitiesOpened}
              onOpenedChange={onEntitiesOpenedChange}
              onSelect={onEntitySelect}
              onClearSelection={onClearSelection}
            />
            <Steps
              steps={steps}
              setSteps={setSteps}
              selectedId={selectedSource === SelectionSource.Steps ? selectedId : null}
              isOpened={stepsOpened}
              onOpenedChange={onStepsOpenedChange}
              isRefreshHidden={stepsRefreshHidden}
              onRefreshHiddenChange={onStepsRefreshHiddenChange}
              onSelect={onStepSelect}
              onClearSelection={onClearSelection}
            />
          </div>
          <div
            className="navigation__resizer"
            role="separator"
            aria-label={"Resize sidebar"}
            aria-orientation="vertical"
            onPointerDown={onResizeStart}
          />
        </>
      )}
    </aside>
  );
}
