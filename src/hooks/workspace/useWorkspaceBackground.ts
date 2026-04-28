import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { workspacePanLimit } from "../../constants/workspace";
import type {
  WorkspaceBackgroundActions,
  WorkspaceBackgroundHandlers,
  WorkspaceBackgroundRefs,
  WorkspaceBackgroundSetters,
  WorkspaceBackgroundState,
} from "../../types/workspaceBackground";
import { clamp } from "../../utils/math/clamp";
import { toInt } from "../../utils/geometry";

type UseWorkspaceBackgroundParams = {
  refs: WorkspaceBackgroundRefs;
  state: WorkspaceBackgroundState;
  setters: WorkspaceBackgroundSetters;
  actions: WorkspaceBackgroundActions;
};

export function useWorkspaceBackground({
  refs,
  state,
  setters,
  actions,
}: UseWorkspaceBackgroundParams): WorkspaceBackgroundHandlers {
  const workspaceRef = refs.workspaceRef;
  const linkSourcePeerIdRef = refs.linkSourcePeerIdRef;
  const stepMessageSourcePeerIdRef = refs.stepMessageSourcePeerIdRef;
  const stepMovePeerIdRef = refs.stepMovePeerIdRef;
  const panStateRef = refs.panStateRef;

  const getWorkspaceCoords = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const element = workspaceRef.current;
      if (!element) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      return {
        x: toInt(localX - state.workspaceSize.width / 2 - state.panOffset.x),
        y: toInt(localY - state.workspaceSize.height / 2 - state.panOffset.y),
      };
    },
    [
      state.panOffset.x,
      state.panOffset.y,
      state.workspaceSize.height,
      state.workspaceSize.width,
      workspaceRef,
    ],
  );

  const handleBackgroundPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;

      setters.setSelectedTextId(null);

      if (state.editingTextId) {
        actions.commitTextEdit();
      }

      if (state.placementMode === "text") {
        const coords = getWorkspaceCoords(event);
        if (!coords) {
          return;
        }

        actions.createTextAt(coords.x, coords.y);
        actions.scheduleHintRestore("text");
        return;
      }

      if (state.placementMode === "peer" || state.placementMode === "obstacle") {
        const coords = getWorkspaceCoords(event);
        if (!coords) {
          return;
        }

        if (state.placementMode === "peer") {
          actions.createPeerAt(coords.x, coords.y);
          actions.scheduleHintRestore("peer");
        } else {
          actions.createObstacleAt(coords.x, coords.y);
          actions.scheduleHintRestore("obstacle");
        }

        return;
      }

      if (state.placementMode === "move") {
        const movePeerId = stepMovePeerIdRef.current;
        if (!movePeerId) {
          actions.onClearSelection();
          actions.showPlacementHint();
          return;
        }

        const coords = getWorkspaceCoords(event);
        if (!coords) {
          return;
        }

        actions.createMoveStep(movePeerId, coords.x, coords.y);
        stepMovePeerIdRef.current = null;
        setters.setCreationSelectedEntityId(null);
        setters.setMoveTargetPreview(null);
        actions.scheduleHintRestore("move");
        return;
      }

      actions.onClearSelection();

      if (state.placementMode === "link") {
        linkSourcePeerIdRef.current = null;
        actions.showPlacementHint();
        return;
      }

      if (state.placementMode === "message") {
        stepMessageSourcePeerIdRef.current = null;
        setters.setCreationSelectedEntityId(null);
        actions.showPlacementHint();
        return;
      }

      if (state.placementMode === "toggle") {
        actions.showPlacementHint();
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      panStateRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: state.panOffset.x,
        startPanY: state.panOffset.y,
      };
    },
    [
      actions,
      getWorkspaceCoords,
      linkSourcePeerIdRef,
      panStateRef,
      setters,
      state.editingTextId,
      state.panOffset.x,
      state.panOffset.y,
      state.placementMode,
      stepMessageSourcePeerIdRef,
      stepMovePeerIdRef,
    ],
  );

  const handleBackgroundPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (state.placementMode === "move" && stepMovePeerIdRef.current) {
        const coords = getWorkspaceCoords(event);
        if (coords) {
          setters.setMoveTargetPreview(coords);
        }
        return;
      }

      const pan = panStateRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - pan.startClientX;
      const deltaY = event.clientY - pan.startClientY;
      setters.setPanOffset({
        x: clamp(pan.startPanX + deltaX, -workspacePanLimit, workspacePanLimit),
        y: clamp(pan.startPanY + deltaY, -workspacePanLimit, workspacePanLimit),
      });
    },
    [getWorkspaceCoords, panStateRef, setters, state.placementMode, stepMovePeerIdRef],
  );

  const handleBackgroundPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const pan = panStateRef.current;
      if (!pan || pan.pointerId !== event.pointerId) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released.
      }
      panStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    },
    [panStateRef],
  );

  return {
    handleBackgroundPointerDown,
    handleBackgroundPointerMove,
    handleBackgroundPointerEnd,
  };
}
