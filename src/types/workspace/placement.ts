import type {
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from "react";

import type { PeerEntity } from "../navigation";
import type { ToolbarPlacementMode } from "../toolbar";

export type WorkspacePlacementRefs = {
  linkSourcePeerIdRef: MutableRefObject<string | null>;
  stepMessageSourcePeerIdRef: MutableRefObject<string | null>;
  stepMovePeerIdRef: MutableRefObject<string | null>;
};

export type WorkspacePlacementState = {
  placementMode: ToolbarPlacementMode;
};

export type WorkspacePlacementSetters = {
  setCreationSelectedEntityId: Dispatch<SetStateAction<string | null>>;
};

export type WorkspacePlacementActions = {
  onEntitySelect: (id: string) => void;
  showPlacementHint: () => void;
  scheduleHintRestore: (mode: ToolbarPlacementMode) => void;
  createMessageStep: (sourcePeerId: string, destinationPeerId: string) => void;
  createToggleStep: (targetEntityId: string) => void;
  createLink: (sourcePeerId: string, destinationPeerId: string) => void;
  handlePeerPointerDownForDrag: (
    peer: PeerEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
};

export type WorkspacePlacementHandlers = {
  handleStaticLinkPointerDown: (linkId: string, event: ReactPointerEvent<SVGLineElement>) => void;
  handlePeerPointerDown: (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => void;
};
