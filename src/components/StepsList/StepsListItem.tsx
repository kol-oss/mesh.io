import { Activity, ChevronsRight, Mail } from "lucide-react";
import type { WorkflowStep } from "../../types/steps";
import TooltipAnchor from "../Tooltip/TooltipAnchor";

type StepsListItemProps = {
  step: WorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
};

export default function StepsListItem({ step, isSelected, onSelect }: StepsListItemProps) {
  const stepTypeTooltip = {
    MOVE: "Move",
    MESSAGE: "Message",
    TOGGLE: "Toggle Status",
  }[step.type];

  const stepTypeIcon = {
    MOVE: <ChevronsRight size={13} />,
    MESSAGE: <Mail size={13} />,
    TOGGLE: <Activity size={13} />,
  }[step.type];

  return (
    <div
      className={`navigation__step-item ${isSelected ? "navigation__step-item--selected" : ""}`}
      onClick={onSelect}
    >
      <TooltipAnchor content={stepTypeTooltip}>
        <span className="navigation__step-type">{stepTypeIcon}</span>
      </TooltipAnchor>
      <span className="navigation__step-title">{step.title}</span>
      <span className="navigation__step-tick">{step.tick}</span>
    </div>
  );
}
