import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import { replaceLinks } from "@/shared/store/slices/linkSlice";
import { replaceObstacles } from "@/shared/store/slices/obstacleSlice";
import { replacePeers } from "@/shared/store/slices/peerSlice";
import { replaceSteps } from "@/shared/store/slices/stepSlice";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import {
  composeStepsWithRefresh,
  normalizeManualSteps,
} from "@/shared/utils/navigation/refreshSteps";
import { useCallback, useMemo } from "react";

export const usePropertiesRedux = () => {
  const dispatch = useAppDispatch();

  const peers = useAppSelector((state) => state.peer);
  const links = useAppSelector((state) => state.link);
  const obstacles = useAppSelector((state) => state.obstacle);
  const manualSteps = useAppSelector((state) => state.step);
  const id = useAppSelector((state) => state.display.selectedId);
  const isCollapsed = useAppSelector((state) => state.display.navCollapsed ?? false);

  const entities = useMemo<NetworkEntity[]>(() => {
    return [...peers, ...links, ...obstacles];
  }, [links, obstacles, peers]);

  const steps = useMemo(() => {
    return composeStepsWithRefresh(normalizeManualSteps(manualSteps, entities), entities);
  }, [entities, manualSteps]);

  const source = useMemo(() => {
    if (!id) {
      return null;
    }

    if (entities.some((entity) => entity.id === id)) {
      return SelectionSource.Entities;
    }

    if (steps.some((step) => step.id === id)) {
      return SelectionSource.Steps;
    }

    return null;
  }, [entities, id, steps]);

  const setEntities = useCallback(
    (value: NetworkEntity[]) => {
      dispatch(
        replacePeers(
          value.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer),
        ),
      );
      dispatch(
        replaceLinks(
          value.filter((entity): entity is LinkEntity => entity.type === EntityType.Link),
        ),
      );
      dispatch(
        replaceObstacles(
          value.filter((entity): entity is ObstacleEntity => entity.type === EntityType.Obstacle),
        ),
      );
    },
    [dispatch],
  );

  const setSteps = useCallback(
    (value: Step[]) => {
      dispatch(replaceSteps(normalizeManualSteps(value, entities)));
    },
    [dispatch, entities],
  );

  return {
    id,
    source,
    isCollapsed,
    entities,
    steps,
    setEntities,
    setSteps,
  };
};
