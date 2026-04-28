import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { PlacementMode } from "../../types/enums";
import type { PeerEntity } from "../../types/navigation";
import type {
  WorkspacePlacementActions,
  WorkspacePlacementHandlers,
  WorkspacePlacementRefs,
  WorkspacePlacementSetters,
  WorkspacePlacementState,
} from "../../types/workspace/placement";

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

      if (state.placementMode === PlacementMode.Toggle) {
        setters.setCreationSelectedEntityId(linkId);
        actions.createToggleStep(linkId);
        setters.setCreationSelectedEntityId(null);
        actions.scheduleHintRestore(PlacementMode.Toggle);
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

      if (state.placementMode === PlacementMode.Message) {
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
        actions.scheduleHintRestore(PlacementMode.Message);
        return;
      }

      if (state.placementMode === PlacementMode.Move) {
        event.stopPropagation();
        stepMovePeerIdRef.current = peer.id;
        setters.setCreationSelectedEntityId(peer.id);
        actions.showPlacementHint();
        return;
      }

      if (state.placementMode === PlacementMode.Toggle) {
        event.stopPropagation();
        setters.setCreationSelectedEntityId(peer.id);
        actions.createToggleStep(peer.id);
        setters.setCreationSelectedEntityId(null);
        actions.scheduleHintRestore(PlacementMode.Toggle);
        return;
      }

      if (state.placementMode === PlacementMode.Link) {
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
        actions.scheduleHintRestore(PlacementMode.Link);
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
