import {
  Activity,
  ChevronsRight,
  Link2,
  Mail,
  Radio,
  RotateCw,
  SquareSlash,
  type LucideIcon,
} from "lucide-react";
import { EntityType } from "../types/model/entities";
import { StepType } from "../types/model/steps";

export const ENTITY_TYPE_ICONS: Record<EntityType, LucideIcon> = {
  [EntityType.Peer]: Radio,
  [EntityType.Link]: Link2,
  [EntityType.Obstacle]: SquareSlash,
};

export const STEP_TYPE_ICONS: Record<StepType, LucideIcon> = {
  [StepType.Message]: Mail,
  [StepType.Move]: ChevronsRight,
  [StepType.Toggle]: Activity,
  [StepType.Refresh]: RotateCw,
};
