import type { PointerEvent as ReactPointerEvent } from "react";

import type { NetworkEntity } from "@/shared/types/model/entities";

export type PropertiesResizeHandler = (event: ReactPointerEvent<HTMLDivElement>) => void;

export type EntityPropertiesProps<T extends NetworkEntity> = {
  selected: T;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  isLocked?: boolean;
};
