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
import React from "react";
import { EntityType } from "../types/model/entities";
import { StepType } from "../types/model/steps";

// Entity icons
export const ENTITY_TYPE_ICONS: Record<EntityType, LucideIcon> = {
  [EntityType.Peer]: Radio,
  [EntityType.Link]: Link2,
  [EntityType.Obstacle]: SquareSlash,
};

export const getEntityTypeIcon = (type: EntityType, size: number = 12) =>
  React.createElement(ENTITY_TYPE_ICONS[type], { size });

// Step icons
export const STEP_TYPE_ICONS: Record<StepType, LucideIcon> = {
  [StepType.Message]: Mail,
  [StepType.Move]: ChevronsRight,
  [StepType.Toggle]: Activity,
  [StepType.Refresh]: RotateCw,
};

export const getStepTypeIcon = (type: StepType, size: number = 12) =>
  React.createElement(STEP_TYPE_ICONS[type], { size });
