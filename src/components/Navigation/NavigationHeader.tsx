import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import TooltipAnchor from "../Tooltip/TooltipAnchor";
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
          <p className="navigation__collapsed-title">Mesh IO</p>
          <NavigationMenu
            onNew={onFileNew}
            onExport={onFileExport}
            onImport={onFileImport}
            isCompact
          />
        </div>
        <TooltipAnchor content="Expand sidebar" placement="bottom">
          <button
            className="navigation__compact-button"
            type="button"
            aria-label="Expand navigation"
            onClick={onToggleCollapse}
          >
            <PanelLeftOpen size={15} />
          </button>
        </TooltipAnchor>
      </div>
    );
  }

  return (
    <div className="navigation__header">
      <div className="navigation__header-general">
        <p className="navigation__header-general-title">Mesh IO</p>
        <p className="navigation__header-general-moto">Design and Learn</p>
      </div>

      <div className="navigation__header-action">
        <TooltipAnchor content="Collapse sidebar" placement="bottom">
          <button
            className="navigation__compact-button navigation__compact-button--inline"
            type="button"
            aria-label="Collapse navigation"
            onClick={onToggleCollapse}
          >
            <PanelLeftClose size={15} />
          </button>
        </TooltipAnchor>
      </div>
    </div>
  );
}
