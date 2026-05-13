import { Check, ChevronDown } from "lucide-react";
import { ActionGroup as ToolbarGroup } from "@/shared/types/action";
import { TooltipPlacement } from "@/shared/types/view/view";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import ToolbarButton from "../ToolbarButton/ToolbarButton";
import {
  TOOLBAR_ICON_STROKE_WIDTH,
  TOOLBAR_MENU_ICON_SIZE,
  TOOLBAR_MENU_CHECK_SIZE,
  TOOLBAR_GROUP_LABELS,
  getModeIconClassName,
} from "@/features/tools/constants/toolbar";
import type { ActionToolMode } from "@/shared/types/action";
import type { ModeButton, ModeGroup } from "@/features/tools/constants/toolbar";

type ToolbarModeGroupProps = {
  group: ModeGroup;
  activeItem: ModeButton;
  isSelected: boolean;
  isDisabled: boolean;
  isSimulationActive: boolean;
  isMenuOpen: boolean;
  onSelect: (groupId: ToolbarGroup, modeKey: ActionToolMode, fromMenu: boolean) => void;
  onMenuToggle: (groupId: ToolbarGroup) => void;
};

export default function ToolbarModeGroup({
  group,
  activeItem,
  isSelected,
  isDisabled,
  isSimulationActive,
  isMenuOpen,
  onSelect,
  onMenuToggle,
}: ToolbarModeGroupProps) {
  const itemIsLocked =
    group.id === ToolbarGroup.Inspection ? !isSimulationActive : activeItem.locked === true;

  if (!group.hasMenu) {
    return (
      <div className="toolbar__group">
        <ToolbarButton
          icon={activeItem.icon}
          label={activeItem.label}
          isActive={isSelected}
          isDisabled={itemIsLocked || isDisabled}
          iconClassName={getModeIconClassName(activeItem.key)}
          ariaPressed={isSelected}
          onClick={() => onSelect(group.id, activeItem.key, false)}
        />
      </div>
    );
  }

  return (
    <div className="toolbar__group">
      <div className="toolbar__menu-group">
        <ToolbarButton
          icon={activeItem.icon}
          label={activeItem.label}
          isActive={isSelected}
          isDisabled={itemIsLocked || isDisabled}
          className="toolbar__menu-trigger"
          iconClassName={getModeIconClassName(activeItem.key)}
          ariaPressed={isSelected}
          onClick={() => onSelect(group.id, activeItem.key, false)}
        />

        <Tooltip content={TOOLBAR_GROUP_LABELS[group.id]} placement={TooltipPlacement.Top}>
          <button
            className={`toolbar__button toolbar__menu-toggle${isMenuOpen ? " toolbar__menu-toggle--open" : ""}`}
            type="button"
            aria-label={`Open ${group.id} menu`}
            aria-expanded={isMenuOpen}
            disabled={isDisabled || itemIsLocked}
            onClick={(event) => {
              if (isDisabled || itemIsLocked) return;
              event.stopPropagation();
              onMenuToggle(group.id);
            }}
          >
            <ChevronDown size={10} strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} />
          </button>
        </Tooltip>

        {isMenuOpen && (
          <div className="toolbar__menu" role="menu" onClick={(e) => e.stopPropagation()}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActiveItem = activeItem.key === item.key;
              const optionIsLocked =
                group.id === ToolbarGroup.Inspection ? !isSimulationActive : item.locked === true;

              return (
                <button
                  className={`toolbar__menu-option${isActiveItem ? " toolbar__menu-option--active" : ""}`}
                  key={`${group.id}-${item.key}`}
                  type="button"
                  role="menuitem"
                  disabled={optionIsLocked || isDisabled}
                  onClick={() => {
                    if (optionIsLocked || isDisabled) return;
                    onSelect(group.id, item.key, true);
                  }}
                >
                  <span className="toolbar__menu-check" aria-hidden="true">
                    {isActiveItem ? (
                      <Check
                        size={TOOLBAR_MENU_CHECK_SIZE}
                        strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                      />
                    ) : null}
                  </span>
                  <Icon
                    size={TOOLBAR_MENU_ICON_SIZE}
                    strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                    className={getModeIconClassName(item.key)}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
