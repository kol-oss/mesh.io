import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { ActionGroup } from "@/shared/types/action";
import { TooltipPlacement } from "@/shared/types/view/view";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TOOLBAR_GROUP_LABELS, TOOLBAR_ICON_STROKE_WIDTH } from "../../constants/toolbar";

type GroupMenuButtonProps = {
  id: ActionGroup;
  isOpened: boolean;
  isEnabled: boolean;
  onClick: (groupId: ActionGroup) => void;
};

export default function GroupMenuButton({
  id,
  isOpened = false,
  isEnabled = true,
  onClick,
}: GroupMenuButtonProps) {
  const ChevronIcon = isOpened ? ChevronUp : ChevronDown;
  return (
    <Tooltip content={TOOLBAR_GROUP_LABELS[id]} placement={TooltipPlacement.Top}>
      <button
        className={`toolbar__button toolbar__menu-toggle${isOpened ? " toolbar__menu-toggle--open" : ""}`}
        type="button"
        aria-label={`Open ${id} menu`}
        aria-expanded={isOpened}
        disabled={!isEnabled}
        onClick={(event) => {
          if (!isEnabled) return;

          event.stopPropagation();
          onClick(id);
        }}
      >
        <ChevronIcon size={10} strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} />
      </button>
    </Tooltip>
  );
}
