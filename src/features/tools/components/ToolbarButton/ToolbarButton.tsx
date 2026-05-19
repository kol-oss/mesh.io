import { TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE_WIDTH } from "@/features/tools/constants/toolbar";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { TooltipPlacement } from "@/shared/types/view/view";
import type { LucideIcon } from "lucide-react";

type ToolbarButtonProps = {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  className?: string;
  iconClassName?: string;
  iconFill?: string;
  ariaPressed?: boolean;
  onClick?: () => void;
};

export default function ToolbarButton({
  icon: Icon,
  label,
  isActive = false,
  isDisabled = false,
  className,
  iconClassName,
  iconFill,
  ariaPressed,
  onClick,
}: ToolbarButtonProps) {
  const buttonClass = `toolbar__button${isActive ? " toolbar__button--active" : ""}${className ? ` ${className}` : ""}`;

  return (
    <Tooltip content={label} placement={TooltipPlacement.Top}>
      <button
        className={buttonClass}
        type="button"
        aria-label={label}
        aria-pressed={ariaPressed}
        disabled={isDisabled}
        onClick={onClick}
      >
        <Icon
          size={TOOLBAR_ICON_SIZE}
          strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
          className={iconClassName}
          {...(iconFill !== undefined ? { fill: iconFill } : {})}
        />
      </button>
    </Tooltip>
  );
}
