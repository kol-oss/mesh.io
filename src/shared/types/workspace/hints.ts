import type { MutableRefObject } from "react";

import type { PeerEntity } from "../entities";
import type { ToolbarPlacementMode } from "../actionmode";
import type { UUID } from "../uuid";

export type WorkspaceHintRefs = {
  placementModeRef: MutableRefObject<ToolbarPlacementMode>;
  hintActiveRef: MutableRefObject<boolean>;
  restoreHintTimerRef: MutableRefObject<number | null>;
  linkSourcePeerIdRef: MutableRefObject<UUID | null>;
  stepMessageSourcePeerIdRef: MutableRefObject<UUID | null>;
  stepMovePeerIdRef: MutableRefObject<UUID | null>;
};

export type WorkspaceHintState = {
  placementMode: ToolbarPlacementMode;
  resolvedCreationSelectedEntityId: UUID | null;
  peers: PeerEntity[];
};

export type WorkspaceHintActions = {
  showToast: (text: string, duration?: number | null) => void;
  dismissToast: () => void;
};
