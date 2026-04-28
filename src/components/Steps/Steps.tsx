import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Activity, ChevronRight, ChevronsRight, Eye, EyeOff, Mail, Plus } from "lucide-react";
import { createPortal } from "react-dom";

import { storageKeys } from "../../constants/storage";
import { useListReorder } from "../../hooks/useListReorder";
import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import { useToast } from "../../hooks/useToast";
import { StepType } from "../../types/enums";
import type {
  MessageStep,
  MoveStep,
  ToggleStatusStep,
  WorkflowStep,
} from "../../types/steps";
import { migrateSteps } from "../../utils/navigation/stepMigration";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";
import Tooltip from "../Tooltip/Tooltip";
import Step from "./Step";

type StepsProps = {
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function Steps({
  steps,
  setSteps,
  selectedId,
  onSelect,
  onClearSelection,
}: StepsProps) {
  const [isOpened, setIsOpened] = useLocalStorage<boolean>(storageKeys.stepsOpened, false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isRefreshHidden, setIsRefreshHidden] = useLocalStorage<boolean>(
    storageKeys.stepsRefreshHidden,
    false,
  );
  const [addMenuPosition, setAddMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const { showToast } = useToast();
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuFloatingRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const visibleSteps = isRefreshHidden ? steps.filter((step) => !isRefreshStep(step)) : steps;

  const { dragIndex, dropIndex, suppressNextClickRef, handleItemPointerDown } = useListReorder({
    items: visibleSteps,
    setItems: setSteps,
    containerRef: itemsContainerRef,
    itemSelector: ".navigation__step-item",
    canStartDrag: ({ index, items }) => {
      const step = items[index];
      return Boolean(step) && !isRefreshStep(step);
    },
    getDropBounds: ({ index, items }) => {
      const draggedStep = items[index];
      if (!draggedStep || isRefreshStep(draggedStep)) {
        return null;
      }

      const sameTickIndices = items
        .map((step, itemIndex) =>
          step.tick === draggedStep.tick && !isRefreshStep(step) ? itemIndex : -1,
        )
        .filter((itemIndex) => itemIndex !== -1);

      if (sameTickIndices.length === 0) {
        return null;
      }

      return {
        min: sameTickIndices[0],
        max: sameTickIndices[sameTickIndices.length - 1] + 1,
      };
    },
  });

  useEffect(() => {
    const migratedSteps = migrateSteps(steps);
    if (!migratedSteps) {
      return;
    }
    setSteps(migratedSteps);
  }, [steps, setSteps]);

  const handleDeleteStep = useCallback(() => {
    if (!selectedId) return;
    const index = visibleSteps.findIndex((s) => s.id === selectedId);
    if (index === -1 || isRefreshStep(visibleSteps[index])) {
      return;
    }
    const stepToDelete = visibleSteps[index];
    const updatedSteps = visibleSteps.filter((s) => s.id !== selectedId);
    setSteps(updatedSteps);
    showToast(`Step "${stepToDelete?.title}" deleted`);
    const nextStep = updatedSteps[index] ?? updatedSteps[index - 1];
    if (nextStep) {
      onSelect(nextStep.id);
    } else {
      onClearSelection();
    }
  }, [selectedId, visibleSteps, setSteps, showToast, onSelect, onClearSelection]);

  useEffect(() => {
    if (!isRefreshHidden || !selectedId) {
      return;
    }

    const selectedStep = steps.find((step) => step.id === selectedId);
    if (selectedStep && isRefreshStep(selectedStep)) {
      onClearSelection();
    }
  }, [isRefreshHidden, onClearSelection, selectedId, steps]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && selectedId && isOpened) {
        handleDeleteStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, isOpened, handleDeleteStep]);

  useEffect(() => {
    if (!isAddMenuOpen) {
      return;
    }

    const onWindowMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        (addMenuRef.current && addMenuRef.current.contains(targetNode)) ||
        (addMenuFloatingRef.current && addMenuFloatingRef.current.contains(targetNode))
      ) {
        return;
      }
      setIsAddMenuOpen(false);
    };

    window.addEventListener("mousedown", onWindowMouseDown);
    return () => window.removeEventListener("mousedown", onWindowMouseDown);
  }, [isAddMenuOpen]);

  const toggleOpen = () => setIsOpened(!isOpened);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddStepClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isOpened) {
      setIsOpened(true);
    }

    const triggerRect = addButtonRef.current?.getBoundingClientRect();
    if (triggerRect) {
      setAddMenuPosition({
        top: triggerRect.top + triggerRect.height / 2,
        left: triggerRect.right + 6,
      });
    }
    setIsAddMenuOpen((prev) => !prev);
  };

  const handleCreateStep = (
    type: typeof StepType.Move | typeof StepType.Message | typeof StepType.ToggleStatus,
  ) => {
    const manualSteps = steps.filter((step) => !isRefreshStep(step));
    const nextTick =
      manualSteps.length > 0 ? Math.max(1, manualSteps[manualSteps.length - 1].tick) : 1;
    const newStep: WorkflowStep =
      type === StepType.Message
        ? ({
            id: `step-${Date.now()}`,
            title: "Message",
            type: StepType.Message,
            tick: nextTick,
            sourcePeerId: "",
            destinationPeerId: "",
          } satisfies MessageStep)
        : type === StepType.ToggleStatus
          ? ({
              id: `step-${Date.now()}`,
              title: "Toggle",
              type: StepType.ToggleStatus,
              tick: nextTick,
              targetEntityId: "",
            } satisfies ToggleStatusStep)
          : ({
              id: `step-${Date.now()}`,
              title: "Move",
              type: StepType.Move,
              tick: nextTick,
              movePeerId: "",
              x: 0,
              y: 0,
            } satisfies MoveStep);
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    onSelect(newStep.id);
    setIsAddMenuOpen(false);
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
        {isOpened && (
          <Tooltip content={isRefreshHidden ? "Show routing steps" : "Hide routing steps"}>
            <button
              className="navigation__steps-add"
              onClick={(event) => {
                event.stopPropagation();
                setIsRefreshHidden(!isRefreshHidden);
              }}
              type="button"
              aria-label={isRefreshHidden ? "Show routing steps" : "Hide routing steps"}
            >
              {isRefreshHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </Tooltip>
        )}
        <div className="navigation__steps-add-wrap" ref={addMenuRef}>
          <Tooltip content="Add new step">
            <button
              ref={addButtonRef}
              className="navigation__steps-add"
              onClick={handleAddStepClick}
              type="button"
              aria-label="Add new step"
            >
              <Plus size={14} />
            </button>
          </Tooltip>
        </div>

        {isAddMenuOpen &&
          addMenuPosition &&
          createPortal(
            <div
              className="navigation__steps-add-menu"
              ref={addMenuFloatingRef}
              style={{ top: `${addMenuPosition.top}px`, left: `${addMenuPosition.left}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="navigation__steps-add-option"
                onClick={() => handleCreateStep(StepType.Move)}
                type="button"
              >
                <ChevronsRight size={12} />
                Move
              </button>
              <button
                className="navigation__steps-add-option"
                onClick={() => handleCreateStep(StepType.Message)}
                type="button"
              >
                <Mail size={12} />
                Message
              </button>
              <button
                className="navigation__steps-add-option"
                onClick={() => handleCreateStep(StepType.ToggleStatus)}
                type="button"
              >
                <Activity size={12} />
                Toggle
              </button>
            </div>,
            document.body,
          )}
      </div>

      {isOpened && (
        <div
          className={`navigation__steps-items${dragIndex !== null ? " navigation__steps-items--reordering" : ""}`}
          ref={itemsContainerRef}
        >
          {visibleSteps.map((step, index) => (
            <Fragment key={step.id}>
              {dragIndex !== null && dropIndex === index && (
                <div className="navigation__step-drop-indicator" />
              )}
              <Step
                step={step}
                isSelected={selectedId === step.id}
                isDragging={dragIndex === index}
                onSelect={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  onSelect(step.id);
                }}
                onPointerDown={(e) => {
                  if (isRefreshStep(step)) {
                    return;
                  }
                  handleItemPointerDown(index, e);
                }}
              />
            </Fragment>
          ))}
          {dragIndex !== null && dropIndex === visibleSteps.length && (
            <div className="navigation__step-drop-indicator" />
          )}
        </div>
      )}
    </div>
  );
}
