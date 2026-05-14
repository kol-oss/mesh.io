import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import { clearLinks, replaceLinks } from "@/shared/store/slices/linkSlice";
import { clearObstacles, replaceObstacles } from "@/shared/store/slices/obstacleSlice";
import { clearPeers, replacePeers } from "@/shared/store/slices/peerSlice";
import { clearSteps, replaceSteps } from "@/shared/store/slices/stepSlice";
import { clearTexts, replaceTexts } from "@/shared/store/slices/textSlice";
import {
  TABS,
  clearState,
  setOpenedTab,
  replaceDisplay,
  setRefreshHidden,
  setSelectedId,
  toggleNavCollapsed,
} from "@/shared/store/slices/displaySlice";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import { EntityType } from "@/shared/types/model/entities";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";
import type { WorkflowStep } from "@/shared/types/model/steps";
import { useToast } from "@/shared/toast/useToast";
import {
  exportState,
  importState,
  type WorkspaceImportPayload,
} from "@/shared/utils/migration/migration";
import {
  composeStepsWithRefresh,
  normalizeManualSteps,
  sanitizeManualSteps,
} from "@/shared/utils/navigation/refreshSteps";
import type { UUID } from "@/shared/types/common/uuid";

export const useNavigationRedux = () => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();

  const peers = useAppSelector((state) => state.peer);
  const links = useAppSelector((state) => state.link);
  const obstacles = useAppSelector((state) => state.obstacle);
  const manualSteps = useAppSelector((state) => state.step);
  const texts = useAppSelector((state) => state.text);
  const display = useAppSelector((state) => state.display);
  const selectedId = useAppSelector((state) => state.display.selectedId);
  const openedTabs = useAppSelector((state) => state.display.openedTabs);
  const isRefreshHidden = useAppSelector((state) => state.display.refreshHidden);
  const isNavCollapsed = useAppSelector((state) => state.display.navCollapsed ?? false);

  const entities = useMemo<NetworkEntity[]>(() => {
    return [...peers, ...links, ...obstacles];
  }, [links, obstacles, peers]);

  const steps = useMemo(
    () => composeStepsWithRefresh(normalizeManualSteps(manualSteps), entities),
    [entities, manualSteps],
  );

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

  const clearSelection = useCallback(() => {
    dispatch(setSelectedId(null));
  }, [dispatch]);

  const selectEntity = useCallback(
    (id: UUID) => {
      if (selectedSource === SelectionSource.Entities && selectedId === id) {
        dispatch(setSelectedId(null));
        return;
      }

      dispatch(setSelectedId(id));
    },
    [dispatch, selectedId, selectedSource],
  );

  const selectStep = useCallback(
    (id: UUID) => {
      if (selectedSource === SelectionSource.Steps && selectedId === id) {
        dispatch(setSelectedId(null));
        return;
      }

      dispatch(setSelectedId(id));
    },
    [dispatch, selectedId, selectedSource],
  );

  const setEntitiesOpened = useCallback(
    (opened: boolean) => {
      dispatch(setOpenedTab({ tab: TABS.ENTITIES, opened }));
    },
    [dispatch],
  );

  const setStepsOpened = useCallback(
    (opened: boolean) => {
      dispatch(setOpenedTab({ tab: TABS.STEPS, opened }));
    },
    [dispatch],
  );

  const setStepsRefreshHidden = useCallback(
    (hidden: boolean) => {
      dispatch(setRefreshHidden(hidden));
    },
    [dispatch],
  );

  const handleNewWorkspace = useCallback(() => {
    const hasData = entities.length > 0 || manualSteps.length > 0;

    if (
      hasData &&
      !window.confirm("This action will clear all current entities and steps. Continue?")
    ) {
      return;
    }

    dispatch(clearPeers());
    dispatch(clearLinks());
    dispatch(clearObstacles());
    dispatch(clearSteps());
    dispatch(clearTexts());
    dispatch(setSelectedId(null));
    showToast("Started a new simulation");
  }, [dispatch, entities.length, manualSteps.length, showToast]);

  const handleExportWorkspace = useCallback(() => {
    const payload: WorkspaceImportPayload = {
      peers,
      links,
      obstacles,
      steps: sanitizeManualSteps(manualSteps),
      texts,
      display,
    };

    exportState(payload);
    showToast("Workspace exported as JSON");
  }, [display, links, manualSteps, obstacles, peers, showToast, texts]);

  const handleImportWorkspace = useCallback(
    async (file: File) => {
      try {
        const payload = await importState(file);

        const confirmed = window.confirm(
          "Import action will clear the current environment and replace it with data from the file. Continue?",
        );
        if (!confirmed) {
          return;
        }

        dispatch(replacePeers(payload.peers));
        dispatch(replaceLinks(payload.links));
        dispatch(replaceObstacles(payload.obstacles));
        dispatch(replaceSteps(sanitizeManualSteps(payload.steps)));
        dispatch(replaceTexts(payload.texts));
        dispatch(clearState());
        dispatch(replaceDisplay(payload.display));
        showToast("Workspace imported successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import workspace";
        showToast(message);
      }
    },
    [dispatch, showToast],
  );

  const onToggleCollapse = useCallback(() => {
    dispatch(toggleNavCollapsed());
  }, [dispatch]);

  return {
    entities,
    steps,
    selectedId,
    selectedSource,
    entitiesOpened: openedTabs.entities,
    stepsOpened: openedTabs.steps,
    stepsRefreshHidden: isRefreshHidden,
    isCollapsed: isNavCollapsed,
    setEntities,
    setSteps,
    onEntitySelect: selectEntity,
    onStepSelect: selectStep,
    onClearSelection: clearSelection,
    onEntitiesOpenedChange: setEntitiesOpened,
    onStepsOpenedChange: setStepsOpened,
    onStepsRefreshHiddenChange: setStepsRefreshHidden,
    onFileNew: handleNewWorkspace,
    onFileExport: handleExportWorkspace,
    onFileImport: handleImportWorkspace,
    onToggleCollapse,
  };
};
