import type { Mode, ModeGroup } from "@/features/tools/constants/toolbar";
import { getModeIconClassName } from "@/features/tools/constants/toolbar";
import type { ActionToolMode } from "@/shared/types/action";
import { ActionGroup as ToolbarGroup } from "@/shared/types/action";
import Button from "../Button/Button";
import GroupMenu from "../GroupMenu/GroupMenu";
import GroupMenuButton from "../GroupMenu/GroupMenuButton";

type ModeButtonProps = {
  group: ModeGroup;
  mode: Mode;
  isActive: boolean;
  isDisabled: boolean;
  isOpened: boolean;
  onSelect: (groupId: ToolbarGroup, modeKey: ActionToolMode, fromMenu: boolean) => void;
  onToggle: (groupId: ToolbarGroup) => void;
};

export default function ModeButton({
  group,
  mode,
  isActive,
  isDisabled,
  isOpened,
  onSelect,
  onToggle,
}: ModeButtonProps) {
  return (
    <div className="toolbar__group">
      <div className="toolbar__menu-group">
        <Button
          icon={mode.icon}
          name={mode.label}
          isActive={isActive}
          isDisabled={isDisabled}
          className="toolbar__menu-trigger"
          iconClassName={getModeIconClassName(mode.key)}
          onClick={() => onSelect(group.id, mode.key, false)}
        />

        <GroupMenuButton
          id={group.id}
          isOpened={isOpened}
          isEnabled={!isDisabled}
          onClick={() => onToggle(group.id)}
        />

        {isOpened && (
          <GroupMenu group={group} mode={mode.key} isEnabled={!isDisabled} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}
