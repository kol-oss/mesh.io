import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { PAN_LIMIT } from "@/shared/constants/workspace";
import { ActionMode as PlacementMode } from "@/shared/types/action";
import type {
  WorkspaceBackgroundActions,
  WorkspaceBackgroundHandlers,
  WorkspaceBackgroundRefs,
  WorkspaceBackgroundSetters,
  WorkspaceBackgroundState,
} from "@/shared/types/workspace/background";
import { clamp } from "@/shared/utils/math/clamp";
import { toInt } from "@/shared/processor/connectivity";

type UseBackgroundParams = {
  refs: WorkspaceBackgroundRefs;
  state: WorkspaceBackgroundState;
  setters: WorkspaceBackgroundSetters;
  actions: WorkspaceBackgroundActions;
};

export function useBackground({
  refs,
  state,
  setters,
  actions,
}: UseBackgroundParams): WorkspaceBackgroundHandlers {
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

      if (state.placementMode === PlacementMode.Text) {
        const coords = getWorkspaceCoords(event);
        if (!coords) {
          return;
        }

        actions.createTextAt(coords.x, coords.y);
        actions.scheduleHintRestore(PlacementMode.Text);
        return;
      }

      if (
        state.placementMode === PlacementMode.Peer ||
        state.placementMode === PlacementMode.Obstacle
      ) {
        const coords = getWorkspaceCoords(event);
        if (!coords) {
          return;
        }

        if (state.placementMode === PlacementMode.Peer) {
          actions.createPeerAt(coords.x, coords.y);
          actions.scheduleHintRestore(PlacementMode.Peer);
        } else {
          actions.createObstacleAt(coords.x, coords.y);
          actions.scheduleHintRestore(PlacementMode.Obstacle);
        }

        return;
      }

      if (state.placementMode === PlacementMode.Move) {
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
        actions.scheduleHintRestore(PlacementMode.Move);
        return;
      }

      actions.onClearSelection();

      if (state.placementMode === PlacementMode.Link) {
        linkSourcePeerIdRef.current = null;
        actions.showPlacementHint();
        return;
      }

      if (state.placementMode === PlacementMode.Message) {
        stepMessageSourcePeerIdRef.current = null;
        setters.setCreationSelectedEntityId(null);
        actions.showPlacementHint();
        return;
      }

      if (state.placementMode === PlacementMode.Toggle) {
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
      if (state.placementMode === PlacementMode.Move && stepMovePeerIdRef.current) {
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
        x: clamp(pan.startPanX + deltaX, -PAN_LIMIT, PAN_LIMIT),
        y: clamp(pan.startPanY + deltaY, -PAN_LIMIT, PAN_LIMIT),
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
