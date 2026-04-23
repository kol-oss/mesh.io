import type { WorkflowStep } from "../../types/steps";

type StepsListItemProps = {
  step: WorkflowStep;
  isSelected: boolean;
  onSelect: () => void;
};

export default function StepsListItem({ step, isSelected, onSelect }: StepsListItemProps) {
  return (
    <div
      className={`navigation__step-item ${isSelected ? "navigation__step-item--selected" : ""}`}
      onClick={onSelect}
    >
      <span className="navigation__step-type">{step.type}</span>
      <span className="navigation__step-title">{step.title}</span>
    </div>
  );
}
