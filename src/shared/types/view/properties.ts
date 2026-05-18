import type { PointerEvent as ReactPointerEvent } from "react";

import type { NetworkEntity } from "@/shared/types/model/entities";

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
