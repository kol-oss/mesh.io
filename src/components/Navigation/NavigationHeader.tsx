import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAVIGATION_MENU_ITEMS } from "../../utils/navigation/constants";

type NavigationHeaderProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export default function NavigationHeader({ isCollapsed, onToggleCollapse }: NavigationHeaderProps) {
  if (isCollapsed) {
    return (
      <div className="navigation__collapsed-bar">
        <div className="navigation__collapsed-content">
          <p className="navigation__collapsed-title">Mesh IO</p>
          <div className="navigation__collapsed-menu" aria-label="Navigation menu">
            {NAVIGATION_MENU_ITEMS.map((menuItem) => (
              <button
                className="navigation__menu-button navigation__collapsed-menu-button"
                key={menuItem.title}
                type="button"
              >
                {menuItem.title}
              </button>
            ))}
          </div>
        </div>
        <button
          className="navigation__compact-button"
          type="button"
          aria-label="Expand navigation"
          onClick={onToggleCollapse}
        >
          <PanelLeftOpen size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="navigation__header">
      <div className="navigation__header-general">
        <p className="navigation__header-general-title">Mesh IO</p>
        <p className="navigation__header-general-moto">Design and Learn</p>
      </div>

      <div>
        <button
          className="navigation__compact-button"
          type="button"
          aria-label="Collapse navigation"
          onClick={onToggleCollapse}
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
    </div>
  );
}
