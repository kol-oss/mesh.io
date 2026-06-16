import type {
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from "react";

import type { PeerEntity } from "@/shared/types/model/entities";
import type { ToolbarPlacementMode } from "@/shared/types/action";
import type { UUID } from "@/shared/types/common/uuid";

export type WorkspacePlacementRefs = {
  linkSourcePeerIdRef: MutableRefObject<UUID | null>;
  stepMessageSourcePeerIdRef: MutableRefObject<UUID | null>;
  stepMovePeerIdRef: MutableRefObject<UUID | null>;
};

export type WorkspacePlacementState = {
  placementMode: ToolbarPlacementMode;
};

export type WorkspacePlacementSetters = {
  setCreationSelectedEntityId: Dispatch<SetStateAction<UUID | null>>;
};

export type WorkspacePlacementActions = {
  onEntitySelect: (id: UUID) => void;
  showPlacementHint: () => void;
  scheduleHintRestore: (mode: ToolbarPlacementMode) => void;
  createMessageStep: (sourcePeerId: UUID, destinationPeerId: UUID) => void;
  createToggleStep: (targetEntityId: UUID) => void;
  createLink: (sourcePeerId: UUID, destinationPeerId: UUID) => void;
  handlePeerPointerDownForDrag: (
    peer: PeerEntity,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
};

export type WorkspacePlacementHandlers = {
  handleStaticLinkPointerDown: (linkId: UUID, event: ReactPointerEvent<SVGLineElement>) => void;
  handlePeerPointerDown: (peer: PeerEntity, event: ReactPointerEvent<HTMLButtonElement>) => void;
};
