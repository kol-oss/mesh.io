import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import { replaceLinks } from "@/shared/store/slices/linkSlice";
import { replaceObstacles } from "@/shared/store/slices/obstacleSlice";
import { replacePeers } from "@/shared/store/slices/peerSlice";
import { replaceSteps } from "@/shared/store/slices/stepSlice";
import { EntityType } from "@/shared/types/model/entities";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";
import type { WorkflowStep } from "@/shared/types/model/steps";
import {
  composeStepsWithRefresh,
  normalizeManualSteps,
} from "@/shared/utils/navigation/refreshSteps";

export const usePropertiesRedux = () => {
  const dispatch = useAppDispatch();

  const peers = useAppSelector((state) => state.peer);
  const links = useAppSelector((state) => state.link);
  const obstacles = useAppSelector((state) => state.obstacle);
  const manualSteps = useAppSelector((state) => state.step);
  const selectedId = useAppSelector((state) => state.display.selectedId);
  const isNavCollapsed = useAppSelector((state) => state.display.navCollapsed ?? false);

  const entities = useMemo<NetworkEntity[]>(() => {
    return [...peers, ...links, ...obstacles];
  }, [links, obstacles, peers]);

  const steps = useMemo(() => {
    return composeStepsWithRefresh(normalizeManualSteps(manualSteps), entities);
  }, [entities, manualSteps]);

  const selectedSource = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    if (entities.some((entity) => entity.id === selectedId)) {
      return SelectionSource.Entities;
    }

    if (steps.some((step) => step.id === selectedId)) {
      return SelectionSource.Steps;
    }

    return null;
  }, [entities, selectedId, steps]);

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
    (value: WorkflowStep[]) => {
      dispatch(replaceSteps(normalizeManualSteps(value)));
    },
    [dispatch],
  );

  return {
    entities,
    steps,
    selectedId,
    selectedSource,
    isNavCollapsed,
    setEntities,
    setSteps,
  };
};
