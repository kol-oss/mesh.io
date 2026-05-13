import { useCallback, useEffect } from "react";

import { ActionMode as PlacementMode } from "@/shared/types/action";
import type {
  WorkspaceHintActions,
  WorkspaceHintRefs,
  WorkspaceHintState,
} from "@/shared/types/workspace/hints";
import type { ToolbarPlacementMode } from "@/shared/types/action";

type UseWorkspaceHintsParams = {
  refs: WorkspaceHintRefs;
  state: WorkspaceHintState;
  actions: WorkspaceHintActions;
};

export function useWorkspaceHints({ refs, state, actions }: UseWorkspaceHintsParams) {
  const placementModeRef = refs.placementModeRef;
  const hintActiveRef = refs.hintActiveRef;
  const restoreHintTimerRef = refs.restoreHintTimerRef;
  const linkSourcePeerIdRef = refs.linkSourcePeerIdRef;
  const stepMessageSourcePeerIdRef = refs.stepMessageSourcePeerIdRef;
  const stepMovePeerIdRef = refs.stepMovePeerIdRef;

  const clearRestoreHintTimer = useCallback(() => {
    if (restoreHintTimerRef.current === null) {
      return;
    }

    window.clearTimeout(restoreHintTimerRef.current);
    restoreHintTimerRef.current = null;
  }, []);

  const showPlacementHint = useCallback(() => {
    const mode = placementModeRef.current;
    if (!mode) {
      return;
    }

    const text =
      mode === PlacementMode.Peer
        ? "Click on workspace to place a peer"
        : mode === PlacementMode.Obstacle
          ? "Click on workspace to place an obstacle"
          : mode === PlacementMode.Link
            ? linkSourcePeerIdRef.current
              ? "Select destination peer"
              : "Select source peer"
            : mode === PlacementMode.Message
              ? stepMessageSourcePeerIdRef.current
                ? "Select destination peer"
                : "Select source peer"
              : mode === PlacementMode.Move
                ? state.resolvedCreationSelectedEntityId
                  ? "Click destination point on workspace"
                  : "Select peer to move"
                : mode === PlacementMode.Text
                  ? "Click on workspace to place text"
                  : "Select a peer or link";

    hintActiveRef.current = true;
    actions.showToast(text, null);
  }, [actions.showToast, state.resolvedCreationSelectedEntityId]);

  const scheduleHintRestore = useCallback(
    (mode: ToolbarPlacementMode) => {
      clearRestoreHintTimer();
      restoreHintTimerRef.current = window.setTimeout(() => {
        if (placementModeRef.current !== mode) {
          return;
        }
        showPlacementHint();
      }, 1900);
    },
    [clearRestoreHintTimer, showPlacementHint],
  );

  useEffect(() => {
    placementModeRef.current = state.placementMode;

    if (state.placementMode !== PlacementMode.Link) {
      linkSourcePeerIdRef.current = null;
    }

    if (state.placementMode !== PlacementMode.Message) {
      stepMessageSourcePeerIdRef.current = null;
    }

    if (state.placementMode !== PlacementMode.Move) {
      stepMovePeerIdRef.current = null;
    }

    clearRestoreHintTimer();

    if (!state.placementMode) {
      if (hintActiveRef.current) {
        actions.dismissToast();
        hintActiveRef.current = false;
      }
      return;
    }

    showPlacementHint();
  }, [actions.dismissToast, clearRestoreHintTimer, showPlacementHint, state.placementMode]);

  useEffect(() => {
    return () => {
      clearRestoreHintTimer();
    };
  }, [clearRestoreHintTimer]);

  useEffect(() => {
    const sourcePeerId = linkSourcePeerIdRef.current;
    if (!sourcePeerId) {
      return;
    }

    const stillExists = state.peers.some((peer) => peer.id === sourcePeerId);
    if (!stillExists) {
      linkSourcePeerIdRef.current = null;
    }

    if (stepMessageSourcePeerIdRef.current) {
      const messagePeerExists = state.peers.some(
        (peer) => peer.id === stepMessageSourcePeerIdRef.current,
      );
      if (!messagePeerExists) {
        stepMessageSourcePeerIdRef.current = null;
      }
    }

    if (stepMovePeerIdRef.current) {
      const movePeerExists = state.peers.some((peer) => peer.id === stepMovePeerIdRef.current);
      if (!movePeerExists) {
        stepMovePeerIdRef.current = null;
      }
    }
  }, [state.peers]);

  return {
    showPlacementHint,
    scheduleHintRestore,
  };
}
