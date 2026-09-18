import type { UUID } from "@/shared/types/common/uuid";
import type { Step } from "@/shared/types/model/steps";
import { StepType } from "@/shared/types/model/steps";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef } from "react";

type UseMoveIndicatorsParams = {
  steps: Step[];
  setSteps: (value: Step[]) => void;
  isSimulationActive: boolean;
  getWorkspaceCoordsByClientPosition: (
    clientX: number,
    clientY: number,
  ) => { x: number; y: number } | null;
};

type Return = {
  moveIndicatorDragStateRef: React.MutableRefObject<{ pointerId: number; stepId: UUID } | null>;
  handleMoveIndicatorPointerDown: (stepId: UUID, event: ReactPointerEvent<HTMLElement>) => void;
  handleMoveIndicatorPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleMoveIndicatorPointerEnd: (event: ReactPointerEvent<HTMLElement>) => void;
};

export const useMoveIndicatorHandlers = ({
  steps,
  setSteps,
  isSimulationActive,
  getWorkspaceCoordsByClientPosition,
}: UseMoveIndicatorsParams): Return => {
  const moveIndicatorDragStateRef = useRef<{ pointerId: number; stepId: UUID } | null>(null);

  const updateMoveStepTarget = useCallback(
    (stepId: UUID, x: number, y: number) => {
      const nextSteps = steps.map((step) => {
        if (step.id !== stepId || step.type !== StepType.Move) {
          return step;
        }

        return {
          ...step,
          x,
          y,
        };
      });

      setSteps(nextSteps);
    },
    [setSteps, steps],
  );

  const handleMoveIndicatorPointerDown = useCallback(
    (stepId: UUID, event: ReactPointerEvent<HTMLElement>) => {
      if (isSimulationActive || event.button !== 0) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      moveIndicatorDragStateRef.current = {
        pointerId: event.pointerId,
        stepId,
      };
    },
    [isSimulationActive],
  );

  const handleMoveIndicatorPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const dragState = moveIndicatorDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId || isSimulationActive) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();

      const coords = getWorkspaceCoordsByClientPosition(event.clientX, event.clientY);
      if (!coords) {
        return;
      }

      updateMoveStepTarget(dragState.stepId, coords.x, coords.y);
    },
    [getWorkspaceCoordsByClientPosition, isSimulationActive, updateMoveStepTarget],
  );

  const handleMoveIndicatorPointerEnd = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const dragState = moveIndicatorDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released.
    }

    moveIndicatorDragStateRef.current = null;
  }, []);

  return {
    moveIndicatorDragStateRef,
    handleMoveIndicatorPointerDown,
    handleMoveIndicatorPointerMove,
    handleMoveIndicatorPointerEnd,
  };
};
