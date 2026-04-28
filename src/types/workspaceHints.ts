import type { MutableRefObject } from "react";

import type { PeerEntity } from "./navigation";
import type { ToolbarPlacementMode } from "./toolbar";

export type WorkspaceHintRefs = {
  placementModeRef: MutableRefObject<ToolbarPlacementMode>;
  hintActiveRef: MutableRefObject<boolean>;
  restoreHintTimerRef: MutableRefObject<number | null>;
  linkSourcePeerIdRef: MutableRefObject<string | null>;
  stepMessageSourcePeerIdRef: MutableRefObject<string | null>;
  stepMovePeerIdRef: MutableRefObject<string | null>;
};

export type WorkspaceHintState = {
  placementMode: ToolbarPlacementMode;
  resolvedCreationSelectedEntityId: string | null;
  peers: PeerEntity[];
};

export type WorkspaceHintActions = {
  showToast: (text: string, duration?: number | null) => void;
  dismissToast: () => void;
};
