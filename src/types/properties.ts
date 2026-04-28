import type { PointerEvent as ReactPointerEvent } from "react";

import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "./navigation";
import type { WorkflowStep } from "./steps";

export type PropertiesResizeHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

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
  selectedStep: WorkflowStep;
  peers: PeerEntity[];
};

export type LinkPropertiesPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedLink: LinkEntity;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  title: string;
  description: string;
};

export type ObstaclePropertiesPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedObstacle: ObstacleEntity;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  title: string;
  description: string;
};

export type PeerPropertiesPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedPeer: PeerEntity;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  title: string;
  description: string;
};
