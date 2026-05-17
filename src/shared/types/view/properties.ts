import type { PointerEvent as ReactPointerEvent } from "react";

import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";

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
