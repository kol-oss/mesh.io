import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { PeerEntity } from "../../types/navigation";
import type {
  WorkspacePlacementActions,
  WorkspacePlacementHandlers,
  WorkspacePlacementRefs,
  WorkspacePlacementSetters,
  WorkspacePlacementState,
} from "../../types/workspacePlacement";

type UseWorkspacePlacementParams = {
  refs: WorkspacePlacementRefs;
  state: WorkspacePlacementState;
  setters: WorkspacePlacementSetters;
  actions: WorkspacePlacementActions;
};

export function useWorkspacePlacement({
  refs,
  state,
  setters,
  actions,
}: UseWorkspacePlacementParams): WorkspacePlacementHandlers {
  const linkSourcePeerIdRef = refs.linkSourcePeerIdRef;
  const stepMessageSourcePeerIdRef = refs.stepMessageSourcePeerIdRef;
  const stepMovePeerIdRef = refs.stepMovePeerIdRef;

  const handleStaticLinkPointerDown = useCallback(
    (linkId: string, event: ReactPointerEvent<SVGLineElement>) => {
      event.stopPropagation();

      if (state.placementMode === "toggle") {
        setters.setCreationSelectedEntityId(linkId);
        actions.createToggleStep(linkId);
        setters.setCreationSelectedEntityId(null);
        actions.scheduleHintRestore("toggle");
        return;
      }

      actions.onEntitySelect(linkId);
    },
    [actions, setters, state.placementMode],
  );

  const handlePeerPointerDown = useCallback(
    (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      if (state.placementMode === "message") {
        event.stopPropagation();
        const messageSourcePeerId = stepMessageSourcePeerIdRef.current;

        if (!messageSourcePeerId || messageSourcePeerId === peer.id) {
          stepMessageSourcePeerIdRef.current = peer.id;
          setters.setCreationSelectedEntityId(peer.id);
          actions.showPlacementHint();
          return;
        }

        actions.createMessageStep(messageSourcePeerId, peer.id);
        stepMessageSourcePeerIdRef.current = null;
        setters.setCreationSelectedEntityId(null);
        actions.scheduleHintRestore("message");
        return;
      }

      if (state.placementMode === "move") {
        event.stopPropagation();
        stepMovePeerIdRef.current = peer.id;
        setters.setCreationSelectedEntityId(peer.id);
        actions.showPlacementHint();
        return;
      }

      if (state.placementMode === "toggle") {
        event.stopPropagation();
        setters.setCreationSelectedEntityId(peer.id);
        actions.createToggleStep(peer.id);
        setters.setCreationSelectedEntityId(null);
        actions.scheduleHintRestore("toggle");
        return;
      }

      if (state.placementMode === "link") {
        event.stopPropagation();
        const linkSourcePeerId = linkSourcePeerIdRef.current;

        if (!linkSourcePeerId || linkSourcePeerId === peer.id) {
          linkSourcePeerIdRef.current = peer.id;
          actions.onEntitySelect(peer.id);
          actions.showPlacementHint();
          return;
        }

        actions.createLink(linkSourcePeerId, peer.id);
        linkSourcePeerIdRef.current = null;
        actions.scheduleHintRestore("link");
        return;
      }

      actions.handlePeerPointerDownForDrag(peer, event);
    },
    [
      actions,
      linkSourcePeerIdRef,
      setters,
      state.placementMode,
      stepMessageSourcePeerIdRef,
      stepMovePeerIdRef,
    ],
  );

  return {
    handleStaticLinkPointerDown,
    handlePeerPointerDown,
  };
}
