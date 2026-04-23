import type { WorkflowStep } from "../../types/steps";

type StepsListItemProps = {
  step: WorkflowStep;
};

export default function StepsListItem({ step }: StepsListItemProps) {
  return (
    <div className="navigation__step-item">
      <span className="navigation__step-type">{step.type}</span>
      <span className="navigation__step-title">{step.title}</span>
    </div>
  );
}
