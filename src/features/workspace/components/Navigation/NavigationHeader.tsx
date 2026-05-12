import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { TooltipPlacement } from "../../../../shared/types/enums";
import Tooltip from "../../../../shared/ui/components/Tooltip/Tooltip";
import NavigationMenu from "./NavigationMenu";

type NavigationHeaderProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFileNew: () => void;
  onFileExport: () => void;
  onFileImport: (file: File) => void | Promise<void>;
};

export default function NavigationHeader({
  isCollapsed,
  onToggleCollapse,
  onFileNew,
  onFileExport,
  onFileImport,
}: NavigationHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="navigation__collapsed-bar">
        <div className="navigation__collapsed-content">
          <p className="navigation__collapsed-title">{"Mesh IO"}</p>
          <NavigationMenu
            onNew={onFileNew}
            onExport={onFileExport}
            onImport={onFileImport}
            isCompact
          />
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
