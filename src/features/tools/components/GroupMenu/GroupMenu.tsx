import {
  TOOLBAR_ICON_STROKE_WIDTH,
  TOOLBAR_MENU_CHECK_SIZE,
  TOOLBAR_MENU_ICON_SIZE,
  type ModeGroup,
} from "@/features/tools/constants/toolbar";
import { ActionGroup, ActionMode } from "@/shared/types/action";
import { Check } from "lucide-react";

type GroupMenuProps = {
  group: ModeGroup;
  mode: ActionMode;
  isEnabled: boolean;
  onSelect: (group: ActionGroup, mode: ActionMode, fromMenu: boolean) => void;
};

export default function GroupMenu({ group, mode, isEnabled, onSelect }: GroupMenuProps) {
  const { id, items } = group;

  return (
    <div className="toolbar__menu" role="menu" onClick={(e) => e.stopPropagation()}>
      {items.map((item) => {
        const { key, label, icon: Icon } = item;
        const isActive = key === mode;

        return (
          <button
            className={`toolbar__menu-option${isActive ? " toolbar__menu-option--active" : ""}`}
            key={`${id}-${key}`}
            type="button"
            role="menuitem"
            disabled={!isEnabled}
            onClick={() => {
              if (!isEnabled) return;
              onSelect(id, key, true);
            }}
          >
            <span className="toolbar__menu-check" aria-hidden="true">
              {isActive && (
                <Check size={TOOLBAR_MENU_CHECK_SIZE} strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} />
              )}
            </span>
            <Icon size={TOOLBAR_MENU_ICON_SIZE} strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
