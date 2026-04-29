import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ui } from "../../i18n/messages";
import { TooltipPlacement } from "../../types/enums";
import Tooltip from "../Tooltip/Tooltip";
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
          <p className="navigation__collapsed-title">{ui.navigation.appName}</p>
          <NavigationMenu
            onNew={onFileNew}
            onExport={onFileExport}
            onImport={onFileImport}
            isCompact
          />
        </div>
        <Tooltip content={ui.navigation.expandSidebarTooltip} placement={TooltipPlacement.Bottom}>
          <button
            className="navigation__compact-button"
            type="button"
            aria-label={ui.navigation.expandNavigationAria}
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
          alt={ui.navigation.appLogoAlt}
          aria-hidden
        />
        <div className="navigation__header-general-text">
          <p className="navigation__header-general-title">{ui.navigation.appName}</p>
          <p className="navigation__header-general-moto">{ui.navigation.appMotto}</p>
        </div>
      </div>

      <div className="navigation__header-action">
        <Tooltip content={ui.navigation.collapseSidebarTooltip} placement={TooltipPlacement.Bottom}>
          <button
            className="navigation__compact-button navigation__compact-button--inline"
            type="button"
            aria-label={ui.navigation.collapseNavigationAria}
            onClick={onToggleCollapse}
          >
            <PanelLeftClose size={15} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
