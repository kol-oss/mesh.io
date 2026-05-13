import EntityList from "@/features/navigation/components/EntityList/EntityList";
import StepList from "@/features/navigation/components/StepList/StepList";
import Title from "@/features/navigation/components/Title/Title";
import Menu from "@/features/navigation/components/Menu/Menu";
import { useSidebarResize } from "@/shared/hooks/useSidebarResize";
import { useNavigationRedux } from "@/features/navigation/hooks/useNavigationRedux";
import type { SimulationStepResult } from "@/shared/types/model/simulation";

type NavigationProps = {
  currentSimulationStepResult: SimulationStepResult | null;
};

export default function Navigation({ currentSimulationStepResult }: NavigationProps) {
  const { isCollapsed } = useNavigationRedux();
  const { widthPercent, onResizeStart } = useSidebarResize();

  return (
    <aside
      className={`navigation ${isCollapsed ? "navigation--collapsed" : ""}`}
      style={isCollapsed ? undefined : { width: `${widthPercent}%` }}
    >
      <Title />
      {!isCollapsed && (
        <>
          <Menu />
          <div className="navigation__lists">
            <EntityList />
            <StepList currentSimulationStepResult={currentSimulationStepResult} />
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
