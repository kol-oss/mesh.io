import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronRight, Plus } from "lucide-react";

import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import { useToast } from "../../hooks/useToast";
import type { WorkflowStep } from "../../types/steps";
import TooltipAnchor from "../Tooltip/TooltipAnchor";
import StepsListItem from "./StepsListItem";

const STEP_TYPES = ["MOVE", "MESSAGE", "TOGGLE"] as const;

type StepsListProps = {
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function StepsList({
  steps,
  setSteps,
  selectedId,
  onSelect,
  onClearSelection,
}: StepsListProps) {
  const [isOpened, setIsOpened] = useLocalStorage<boolean>("mesh_steps_opened", false);
  const { showToast } = useToast();

  // Drag-to-reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const validRangeRef = useRef<{ min: number; max: number } | null>(null);
  const isDraggingRef = useRef(false);
  const pointerStartYRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef(steps);

  useLayoutEffect(() => {
    stepsRef.current = steps;
  });

  useLayoutEffect(() => {
    dropIndexRef.current = dropIndex;
  });

  useEffect(() => {
    const requiresMigration = steps.some((step) => {
      const rawStep = step as WorkflowStep & {
        tick?: number;
        type?: string;
        sourcePeerId?: string | null;
        destinationPeerId?: string | null;
        targetEntityId?: string | null;
        movePeerId?: string | null;
        x?: number;
        y?: number;
      };

      return (
        typeof rawStep.tick !== "number" ||
        !STEP_TYPES.includes(rawStep.type as (typeof STEP_TYPES)[number]) ||
        (rawStep.sourcePeerId !== null && typeof rawStep.sourcePeerId !== "string") ||
        (rawStep.destinationPeerId !== null && typeof rawStep.destinationPeerId !== "string") ||
        (rawStep.targetEntityId !== null && typeof rawStep.targetEntityId !== "string") ||
        (rawStep.movePeerId !== null && typeof rawStep.movePeerId !== "string") ||
        typeof rawStep.x !== "number" ||
        typeof rawStep.y !== "number"
      );
    });

    if (!requiresMigration) {
      return;
    }

    const migratedSteps = steps.map((step, index) => {
      const rawStep = step as WorkflowStep & {
        tick?: number;
        type?: string;
        sourcePeerId?: string | null;
        destinationPeerId?: string | null;
        targetEntityId?: string | null;
        movePeerId?: string | null;
        x?: number;
        y?: number;
      };

      return {
        ...step,
        type: STEP_TYPES.includes(rawStep.type as (typeof STEP_TYPES)[number])
          ? (rawStep.type as WorkflowStep["type"])
          : "MOVE",
        tick: typeof rawStep.tick === "number" ? rawStep.tick : index + 1,
        sourcePeerId: typeof rawStep.sourcePeerId === "string" ? rawStep.sourcePeerId : null,
        destinationPeerId:
          typeof rawStep.destinationPeerId === "string" ? rawStep.destinationPeerId : null,
        targetEntityId: typeof rawStep.targetEntityId === "string" ? rawStep.targetEntityId : null,
        movePeerId: typeof rawStep.movePeerId === "string" ? rawStep.movePeerId : null,
        x: typeof rawStep.x === "number" ? rawStep.x : 0,
        y: typeof rawStep.y === "number" ? rawStep.y : 0,
      };
    });
    setSteps(migratedSteps);
  }, [steps, setSteps]);

  const handleItemPointerDown = useCallback(
    (index: number, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragIndexRef.current = index;
      isDraggingRef.current = false;
      pointerStartYRef.current = event.clientY;

      const draggedTick = stepsRef.current[index].tick;
      const sameTickIndices = stepsRef.current
        .map((s, i) => (s.tick === draggedTick ? i : -1))
        .filter((i) => i !== -1);
      validRangeRef.current = {
        min: sameTickIndices[0],
        max: sameTickIndices[sameTickIndices.length - 1] + 1,
      };
    },
    [],
  );

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    const onPointerMove = (event: PointerEvent) => {
      if (dragIndexRef.current === null) return;

      if (
        !isDraggingRef.current &&
        Math.abs(event.clientY - pointerStartYRef.current) < DRAG_THRESHOLD
      ) {
        return;
      }

      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDragIndex(dragIndexRef.current);
      }

      const container = itemsContainerRef.current;
      if (!container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(".navigation__step-item"));
      let rawDrop = items.length;

      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          rawDrop = i;
          break;
        }
      }

      const range = validRangeRef.current;
      const newDropIndex = range ? Math.min(Math.max(rawDrop, range.min), range.max) : rawDrop;

      setDropIndex(newDropIndex);
      dropIndexRef.current = newDropIndex;
    };

    const onPointerUp = () => {
      if (dragIndexRef.current === null) return;

      if (isDraggingRef.current && dropIndexRef.current !== null) {
        const from = dragIndexRef.current;
        const to = dropIndexRef.current;
        const current = stepsRef.current;
        const next = [...current];
        const [removed] = next.splice(from, 1);
        next.splice(to > from ? to - 1 : to, 0, removed);
        setSteps(next);
        suppressNextClickRef.current = true;
      }

      dragIndexRef.current = null;
      isDraggingRef.current = false;
      validRangeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDragIndex(null);
      setDropIndex(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [setSteps]);

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

  const toggleOpen = () => setIsOpened(!isOpened);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddStep = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isOpened) {
      setIsOpened(true);
    }

    const nextTick = steps.reduce((maxTick, step) => Math.max(maxTick, step.tick), 0) + 1;
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      title: `Step ${steps.length + 1}`,
      type: "MOVE",
      tick: nextTick,
      sourcePeerId: null,
      destinationPeerId: null,
      targetEntityId: null,
      movePeerId: null,
      x: 0,
      y: 0,
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
        <TooltipAnchor content="Add new step">
          <button
            className="navigation__steps-add"
            onClick={handleAddStep}
            type="button"
            aria-label="Add new step"
          >
            <Plus size={14} />
          </button>
        </TooltipAnchor>
      </div>

      {isOpened && (
        <div
          className={`navigation__steps-items${dragIndex !== null ? " navigation__steps-items--reordering" : ""}`}
          ref={itemsContainerRef}
        >
          {steps.map((step, index) => (
            <Fragment key={step.id}>
              {dragIndex !== null && dropIndex === index && (
                <div className="navigation__step-drop-indicator" />
              )}
              <StepsListItem
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
                onPointerDown={(e) => handleItemPointerDown(index, e)}
              />
            </Fragment>
          ))}
          {dragIndex !== null && dropIndex === steps.length && (
            <div className="navigation__step-drop-indicator" />
          )}
        </div>
      )}
    </div>
  );
}
