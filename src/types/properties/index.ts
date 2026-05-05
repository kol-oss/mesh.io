import type { PointerEvent as ReactPointerEvent } from "react";

import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../navigation";
import type { RefreshStep, WorkflowStep } from "../workspace/steps";

export type PropertiesResizeHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

export type EntityPropertiesPanelProps<T extends NetworkEntity> = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selected: T;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  title: string;
  description: string;
};

export type PeerPropertiesPanelProps = EntityPropertiesPanelProps<PeerEntity>;
export type LinkPropertiesPanelProps = EntityPropertiesPanelProps<LinkEntity>;
export type ObstaclePropertiesPanelProps = EntityPropertiesPanelProps<ObstacleEntity>;

export type StepPropertiesPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedStep: WorkflowStep;
  entities: NetworkEntity[];
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
};

export type RefreshStepPropertiesPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedStep: RefreshStep;
  peers: PeerEntity[];
};
