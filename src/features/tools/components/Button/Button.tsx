import { TOOLBAR_ICON_SIZE, TOOLBAR_ICON_STROKE_WIDTH } from "@/features/tools/constants/toolbar";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { TooltipPlacement } from "@/shared/types/view/view";
import type { LucideIcon } from "lucide-react";

type ButtonProps = {
  name: string;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  iconFill?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
};

export default function Button({
  name,
  icon: Icon,
  isActive = false,
  isDisabled = false,
  className,
  iconClassName,
  iconFill,
  onClick,
}: ButtonProps) {
  const buttonClass = `toolbar__button${isActive ? " toolbar__button--active" : ""}${className ? ` ${className}` : ""}`;

  return (
    <Tooltip content={name} placement={TooltipPlacement.Top}>
      <button
        className={buttonClass}
        type="button"
        aria-label={name}
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
