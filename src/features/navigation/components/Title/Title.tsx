import { useNavigationRedux } from "@/features/navigation/hooks/useNavigationRedux";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { TooltipPlacement } from "@/shared/types/view/view";
import { PanelLeftClose } from "lucide-react";

export default function Title() {
  const { onToggleCollapse } = useNavigationRedux();

  return (
    <div className="navigation__header">
      <div className="navigation__header-general">
        <img
          className="navigation__header-logo"
          src="/favicon.svg"
          alt={"Mesh IO logo"}
          aria-hidden
        />
        <div className="navigation__header-general-text">
          <p className="navigation__header-general-title">{"Mesh IO"}</p>
          <p className="navigation__header-general-moto">{"Design and Learn"}</p>
        </div>
      </div>

      <div className="navigation__header-action">
        <Tooltip content={"Collapse sidebar"} placement={TooltipPlacement.Bottom}>
          <button
            className="navigation__compact-button navigation__compact-button--inline"
            type="button"
            aria-label={"Collapse navigation"}
            onClick={onToggleCollapse}
          >
            <PanelLeftClose size={15} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
