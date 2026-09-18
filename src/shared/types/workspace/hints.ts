import type { MutableRefObject } from "react";

import type { PeerEntity } from "@/shared/types/model/entities";
import type { ActionPlacementMode } from "@/shared/types/action";
import type { UUID } from "@/shared/types/common/uuid";

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
