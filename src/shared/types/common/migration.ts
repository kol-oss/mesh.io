import type { StepSchemaType } from "@/shared/schemas/step/StepSchema";
import type { DisplayState } from "@/shared/store/slices/displaySlice";
import type { LinkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { TextItem } from "@/shared/types/workspace/text";

export type ImportPayload = {
  peers: PeerEntity[];
  links: LinkEntity[];
  obstacles: ObstacleEntity[];
  steps: StepSchemaType[];
  texts: TextItem[];
  display: Partial<DisplayState>;
};
