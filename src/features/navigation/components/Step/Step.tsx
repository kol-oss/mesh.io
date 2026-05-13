import { type PointerEvent as ReactPointerEvent } from "react";
import { Activity, ChevronsRight, Mail, RotateCw } from "lucide-react";
import { StepType } from "@/shared/types/model/steps";
import type { WorkflowStep } from "@/shared/types/model/steps";
import { isRefreshStep } from "@/shared/utils/navigation/refreshSteps";
import Tooltip from "@/shared/components/Tooltip/Tooltip";

type StepProps = {
  step: WorkflowStep;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export default function Step({ step, isSelected, isDragging, onSelect, onPointerDown }: StepProps) {
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
