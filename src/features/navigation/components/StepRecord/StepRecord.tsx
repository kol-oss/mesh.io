import Tooltip from "@/shared/components/Tooltip/Tooltip";
import type { Step } from "@/shared/types/model/steps";
import { StepType } from "@/shared/types/model/steps";
import { isRefreshStep } from "@/shared/utils/navigation/refreshSteps";
import { Activity, ChevronsRight, Mail, RotateCw } from "lucide-react";
import { type PointerEvent as ReactPointerEvent } from "react";

type StepRecordProps = {
  step: Step;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export default function StepRecord({
  step,
  isSelected,
  isDragging,
  onSelect,
  onPointerDown,
}: StepRecordProps) {
  const stepTypeTooltip = {
    [StepType.Move]: "Move",
    [StepType.Message]: "Message",
    [StepType.Toggle]: "Toggle Status",
    [StepType.Refresh]: "Routing Refresh",
  }[step.type];

  const stepTypeIcon = {
    [StepType.Move]: <ChevronsRight size={13} />,
    [StepType.Message]: <Mail size={13} />,
    [StepType.Toggle]: <Activity size={13} />,
    [StepType.Refresh]: <RotateCw size={13} />,
  }[step.type];

  return (
    <div
      className={`navigation__step-item${isSelected ? " navigation__step-item--selected" : ""}${isDragging ? " navigation__step-item--dragging" : ""}`}
      onClick={onSelect}
      onPointerDown={onPointerDown}
    >
      <Tooltip content={stepTypeTooltip}>
        <span className="navigation__step-type">{stepTypeIcon}</span>
      </Tooltip>
      <span
        className={`navigation__step-title${isRefreshStep(step) ? " navigation__step-title--auto" : ""}`}
      >
        {step.title}
      </span>
      <span className="navigation__step-tick">{step.tick}</span>
    </div>
  );
}
