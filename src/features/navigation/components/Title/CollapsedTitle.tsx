import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { TooltipPlacement } from "@/shared/types/view/view";
import { PanelLeftOpen } from "lucide-react";
import { useNavigationRedux } from "../../hooks/useNavigationRedux";
import Menu from "../Menu/Menu";

export default function CollapsedTitle() {
  const { onToggleCollapse } = useNavigationRedux();

  return (
    <div className="navigation__collapsed-bar">
      <div className="navigation__collapsed-content">
        <p className="navigation__collapsed-title">{"Mesh IO"}</p>
        <Menu isCompact />
      </div>
      <Tooltip content={"Expand sidebar"} placement={TooltipPlacement.Bottom}>
        <button
          className="navigation__compact-button"
          type="button"
          aria-label={"Expand navigation"}
          onClick={onToggleCollapse}
        >
          <PanelLeftOpen size={15} />
        </button>
      </Tooltip>
    </div>
  );
}
