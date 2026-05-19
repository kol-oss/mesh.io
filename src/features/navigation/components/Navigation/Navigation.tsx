import EntityList from "@/features/navigation/components/EntityList/EntityList";
import Menu from "@/features/navigation/components/Menu/Menu";
import StepList from "@/features/navigation/components/StepList/StepList";
import Title from "@/features/navigation/components/Title/Title";
import { useNavigationRedux } from "@/features/navigation/hooks/useNavigationRedux";
import Resizer from "@/shared/components/Resizer/Resizer";
import { useSidebarResize } from "@/shared/hooks/useSidebarResize";
import type { StepResult } from "@/shared/types/model/simulation";
import CollapsedTitle from "../Title/CollapsedTitle";

type NavigationProps = {
  currentSimulationStepResult: StepResult | null;
};

export default function Navigation({ currentSimulationStepResult }: NavigationProps) {
  const { isCollapsed } = useNavigationRedux();
  const { widthPercent, onResizeStart } = useSidebarResize();

  return (
    <aside
      className={`navigation ${isCollapsed ? "navigation--collapsed" : ""}`}
      style={isCollapsed ? undefined : { width: `${widthPercent}%` }}
    >
      {isCollapsed && <CollapsedTitle />}

      {!isCollapsed && (
        <>
          <Title />
          <Menu />
          <div className="navigation__lists">
            <EntityList />
            <StepList currentSimulationStepResult={currentSimulationStepResult} />
          </div>

          <Resizer onResizeStart={onResizeStart} />
        </>
      )}
    </aside>
  );
}
