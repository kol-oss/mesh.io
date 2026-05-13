import type { MutableRefObject } from "react";

import type { PeerEntity } from "../model/entities";
import type { ActionPlacementMode } from "../action";
import type { UUID } from "../common/uuid";

export type WorkspaceHintRefs = {
  placementModeRef: MutableRefObject<ActionPlacementMode | null>;
  hintActiveRef: MutableRefObject<boolean>;
  restoreHintTimerRef: MutableRefObject<number | null>;
  linkSourcePeerIdRef: MutableRefObject<UUID | null>;
  stepMessageSourcePeerIdRef: MutableRefObject<UUID | null>;
  stepMovePeerIdRef: MutableRefObject<UUID | null>;
};

export type WorkspaceHintState = {
  placementMode: ActionPlacementMode | null;
  resolvedCreationSelectedEntityId: UUID | null;
  peers: PeerEntity[];
};

export type WorkspaceHintActions = {
  showToast: (text: string, duration?: number | null) => void;
  dismissToast: () => void;
};
