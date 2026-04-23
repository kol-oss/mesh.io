import {
  useState,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Plus } from "lucide-react";

import { INITIAL_WORKFLOW_STEPS } from "../../utils/navigation/steps";
import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import { useToast } from "../../hooks/useToast";
import type { WorkflowStep } from "../../types/steps";
import StepsListItem from "./StepsListItem";

type StepsListProps = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function StepsList({ selectedId, onSelect, onClearSelection }: StepsListProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [steps, setSteps] = useLocalStorage<WorkflowStep[]>("mesh_steps", INITIAL_WORKFLOW_STEPS);
  const { showToast } = useToast();

  const handleDeleteStep = useCallback(() => {
    if (!selectedId) return;
    const index = steps.findIndex((s) => s.id === selectedId);
    const stepToDelete = steps[index];
    const updatedSteps = steps.filter((s) => s.id !== selectedId);
    setSteps(updatedSteps);
    showToast(`Step "${stepToDelete?.title}" deleted`);
    const nextStep = updatedSteps[index] ?? updatedSteps[index - 1];
    if (nextStep) {
      onSelect(nextStep.id);
    } else {
      onClearSelection();
    }
  }, [selectedId, steps, setSteps, showToast, onSelect, onClearSelection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && selectedId && isOpened) {
        handleDeleteStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, isOpened, handleDeleteStep]);

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
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      title: `Step ${steps.length + 1}`,
      type: "MOVE",
    };
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    showToast(`Step "${newStep.title}" added`);
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
          {steps.map((step) => (
            <StepsListItem
              key={step.id}
              step={step}
              isSelected={selectedId === step.id}
              onSelect={() => onSelect(step.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
