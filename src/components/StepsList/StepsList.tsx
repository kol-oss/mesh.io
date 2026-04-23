import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Plus } from "lucide-react";

import { INITIAL_WORKFLOW_STEPS } from "../../utils/navigation/steps";
import StepsListItem from "./StepsListItem";

export default function StepsList() {
  const [isOpened, setIsOpened] = useState(false);

  const toggleOpen = () => setIsOpened((prevState) => !prevState);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddStep = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // TODO: Add new step logic
  };

  return (
    <div className="navigation__steps">
      <div
        className="navigation__steps-header"
        onClick={toggleOpen}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isOpened}
      >
        <ChevronRight
          size={10}
          className={`navigation__steps-chevron ${
            isOpened ? "navigation__steps-chevron--open" : ""
          }`}
        />
        <span className="navigation__steps-title">Steps</span>
        <button
          className="navigation__steps-add"
          onClick={handleAddStep}
          type="button"
          aria-label="Add new step"
        >
          <Plus size={14} />
        </button>
      </div>

      {isOpened && (
        <div className="navigation__steps-items">
          {INITIAL_WORKFLOW_STEPS.map((step) => (
            <StepsListItem key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
