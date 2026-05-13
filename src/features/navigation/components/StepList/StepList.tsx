import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Activity, ChevronRight, ChevronsRight, Eye, EyeOff, Mail, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useListReorder } from "@/shared/hooks/useListReorder";
import { useToast } from "@/shared/toast/useToast";
import type { SimulationStepResult } from "@/shared/types/model/simulation";
import { StepType } from "@/shared/types/model/steps";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type {
  MessageStep,
  MoveStep,
  RefreshStep,
  ToggleStep,
  WorkflowStep,
} from "@/shared/types/model/steps";
import { generateUUID } from "@/shared/types/common/uuid";
import { migrateSteps } from "@/shared/utils/navigation/stepMigration";
import { isRefreshStep } from "@/shared/utils/navigation/refreshSteps";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { useNavigationRedux } from "@/features/navigation/hooks/useNavigationRedux";
import StepRecord from "../StepRecord/StepRecord";

type StepListProps = {
  currentSimulationStepResult: SimulationStepResult | null;
};

const isSameRefreshStep = (left: RefreshStep, right: RefreshStep) => {
  return (
    left.tick === right.tick &&
    left.refreshPeerId === right.refreshPeerId &&
    left.refreshProtocol === right.refreshProtocol &&
    left.refreshAction === right.refreshAction &&
    left.refreshStartTick === right.refreshStartTick &&
    left.refreshInterval === right.refreshInterval
  );
};

const isSelectedStep = (step: WorkflowStep, selectedStep: WorkflowStep | null) => {
  if (!selectedStep) {
    return false;
  }

  const stepIsRefresh = isRefreshStep(step);
  const selectedIsRefresh = isRefreshStep(selectedStep);

  if (stepIsRefresh || selectedIsRefresh) {
    return stepIsRefresh && selectedIsRefresh && isSameRefreshStep(step, selectedStep);
  }

  return step.id === selectedStep.id;
};

export default function StepList({ currentSimulationStepResult }: StepListProps) {
  const {
    steps,
    setSteps,
    selectedId,
    selectedSource,
    stepsOpened,
    onStepsOpenedChange,
    stepsRefreshHidden,
    onStepsRefreshHiddenChange,
    onStepSelect,
    onClearSelection,
  } = useNavigationRedux();
  const selectedStepId = selectedSource === SelectionSource.Steps ? selectedId : null;
  const currentSimulationStep = currentSimulationStepResult?.step ?? null;

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const { showToast } = useToast();
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuFloatingRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const visibleSteps = stepsRefreshHidden ? steps.filter((step) => !isRefreshStep(step)) : steps;

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
  }, [setSteps, steps]);

  const handleDeleteStep = useCallback(() => {
    if (!selectedStepId) {
      return;
    }

    const index = visibleSteps.findIndex((step) => step.id === selectedStepId);
    if (index === -1 || isRefreshStep(visibleSteps[index])) {
      return;
    }

    const stepToDelete = visibleSteps[index];
    const updatedSteps = visibleSteps.filter((step) => step.id !== selectedStepId);
    setSteps(updatedSteps);
    showToast(`Step "${stepToDelete?.title ?? ""}" deleted`);
    const nextStep = updatedSteps[index] ?? updatedSteps[index - 1];
    if (nextStep) {
      onStepSelect(nextStep.id);
    } else {
      onClearSelection();
    }
  }, [onClearSelection, onStepSelect, selectedStepId, setSteps, showToast, visibleSteps]);

  useEffect(() => {
    if (!stepsRefreshHidden || !selectedStepId) {
      return;
    }

    const selectedStep = steps.find((step) => step.id === selectedStepId);
    if (selectedStep && isRefreshStep(selectedStep)) {
      onClearSelection();
    }
  }, [onClearSelection, selectedStepId, steps, stepsRefreshHidden]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && selectedStepId && stepsOpened) {
        handleDeleteStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStepId, stepsOpened, handleDeleteStep]);

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

  const toggleOpen = () => onStepsOpenedChange(!stepsOpened);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddStepClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!stepsOpened) {
      onStepsOpenedChange(true);
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
    type: typeof StepType.Move | typeof StepType.Message | typeof StepType.Toggle,
  ) => {
    const manualSteps = steps.filter((step) => !isRefreshStep(step));
    const nextTick =
      manualSteps.length > 0 ? Math.max(1, manualSteps[manualSteps.length - 1].tick) : 1;
    const newStep: WorkflowStep =
      type === StepType.Message
        ? ({
            id: generateUUID(),
            title: "Message",
            type: StepType.Message,
            tick: nextTick,
            sourcePeerId: null,
            destinationPeerId: null,
          } satisfies MessageStep)
        : type === StepType.Toggle
          ? ({
              id: generateUUID(),
              title: "Toggle",
              type: StepType.Toggle,
              tick: nextTick,
              targetEntityId: null,
            } satisfies ToggleStep)
          : ({
              id: generateUUID(),
              title: "Move",
              type: StepType.Move,
              tick: nextTick,
              movePeerId: null,
              x: 0,
              y: 0,
            } satisfies MoveStep);

    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    onStepSelect(newStep.id);
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
        aria-expanded={stepsOpened}
      >
        <ChevronRight
          size={10}
          className={`navigation__steps-chevron ${stepsOpened ? "navigation__steps-chevron--open" : ""}`}
        />
        <span className="navigation__steps-title">{"Steps"}</span>
        {stepsOpened && (
          <Tooltip content={stepsRefreshHidden ? "Show routing steps" : "Hide routing steps"}>
            <button
              className="navigation__steps-add"
              onClick={(event) => {
                event.stopPropagation();
                onStepsRefreshHiddenChange(!stepsRefreshHidden);
              }}
              type="button"
              aria-label={stepsRefreshHidden ? "Show routing steps" : "Hide routing steps"}
            >
              {stepsRefreshHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </Tooltip>
        )}
        <div className="navigation__steps-add-wrap" ref={addMenuRef}>
          <Tooltip content={"Add new step"}>
            <button
              ref={addButtonRef}
              className="navigation__steps-add"
              onClick={handleAddStepClick}
              type="button"
              aria-label={"Add new step"}
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
                {"Move"}
              </button>
              <button
                className="navigation__steps-add-option"
                onClick={() => handleCreateStep(StepType.Message)}
                type="button"
              >
                <Mail size={12} />
                {"Message"}
              </button>
              <button
                className="navigation__steps-add-option"
                onClick={() => handleCreateStep(StepType.Toggle)}
                type="button"
              >
                <Activity size={12} />
                {"Toggle"}
              </button>
            </div>,
            document.body,
          )}
      </div>

      {stepsOpened && (
        <div
          className={`navigation__steps-items${dragIndex !== null ? " navigation__steps-items--reordering" : ""}`}
          ref={itemsContainerRef}
        >
          {visibleSteps.map((step, index) => (
            <Fragment key={step.id}>
              {dragIndex !== null && dropIndex === index && (
                <div className="navigation__step-drop-indicator" />
              )}
              <StepRecord
                step={step}
                isSelected={
                  currentSimulationStep
                    ? isSelectedStep(step, currentSimulationStep)
                    : selectedStepId === step.id
                }
                isDragging={dragIndex === index}
                onSelect={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  onStepSelect(step.id);
                }}
                onPointerDown={(event) => {
                  if (isRefreshStep(step)) {
                    return;
                  }
                  handleItemPointerDown(index, event);
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
