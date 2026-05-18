import type { DisplayState } from "@/shared/store/slices/displaySlice";
import type { LinkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";
import type { WorkspaceTextItem } from "@/shared/types/workspace/text";

export type ImportPayload = {
  peers: PeerEntity[];
  links: LinkEntity[];
  obstacles: ObstacleEntity[];
  steps: Step[];
  texts: WorkspaceTextItem[];
  display: Partial<DisplayState>;
};
