import type { ModeButton, ModeGroup } from "@/features/tools/constants/toolbar";
import { getModeIconClassName } from "@/features/tools/constants/toolbar";
import type { ActionToolMode } from "@/shared/types/action";
import { ActionGroup as ToolbarGroup } from "@/shared/types/action";
import GroupMenu from "../GroupMenu/GroupMenu";
import GroupMenuButton from "../GroupMenu/GroupMenuButton";
import ToolbarButton from "../ToolbarButton/ToolbarButton";

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

        <GroupMenuButton
          id={group.id}
          isOpened={isMenuOpen}
          isEnabled={!isDisabled && !itemIsLocked}
          onClick={onMenuToggle}
        />

        {isMenuOpen && (
          <GroupMenu
            group={group}
            mode={activeItem.key}
            isEnabled={!isDisabled}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}
