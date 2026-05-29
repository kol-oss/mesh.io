import { useCallback, useEffect, useRef } from "react";

import { SimulationManager } from "@/features/processor/SimulationManager";
import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import {
  selectCurrentSimulationEvent,
  selectCurrentSimulationEvents,
  selectCurrentSimulationStepResult,
  selectEntities,
  selectIsSimulationActive,
  selectNormalizedCurrentEventIndex,
  selectNormalizedSteps,
  selectSelectedSource,
  selectSteps,
} from "@/shared/store/selectors";
import { setPlacementMode } from "@/shared/store/slices/boardSlice";
import {
  TABS,
  clearState,
  replaceDisplay,
  setOpenedTab,
  setRefreshHidden,
  setSelectedId,
  toggleNavCollapsed,
} from "@/shared/store/slices/displaySlice";
import { clearLinks, replaceLinks } from "@/shared/store/slices/linkSlice";
import { clearObstacles, replaceObstacles } from "@/shared/store/slices/obstacleSlice";
import { clearPeers, replacePeers } from "@/shared/store/slices/peerSlice";
import {
  clearSimulation,
  setCurrentEventIndex,
  setCurrentStepIndex,
  setInspectionMode,
  setIsRunning,
  simulationCompleted,
  type SimulationInspectionMode,
} from "@/shared/store/slices/simulationSlice";
import { clearSteps, replaceSteps } from "@/shared/store/slices/stepSlice";
import { clearTexts, replaceTexts } from "@/shared/store/slices/textSlice";
import { useToast } from "@/shared/toast/useToast";
import type { ToolbarPlacementMode } from "@/shared/types/action";
import { ActionMode as PlacementMode, ActionMode as ToolbarMode } from "@/shared/types/action";
import type { SimulationInput, SimulationResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type { TextItem } from "@/shared/types/workspace/text";
import {
  exportState,
  importState,
  type WorkspaceImportPayload,
} from "@/shared/utils/migration/migration";
import { normalizeManualSteps, sanitizeManualSteps } from "@/shared/utils/navigation/refreshSteps";

export function useBoardStore() {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const simulationRunLockRef = useRef(false);

  const placementMode = useAppSelector((state) => state.board.placementMode);
  const display = useAppSelector((state) => state.display);
  const selectedId = useAppSelector((state) => state.display.selectedId);
  const openedTabs = useAppSelector((state) => state.display.openedTabs);
  const isRefreshHidden = useAppSelector((state) => state.display.refreshHidden);
  const isNavCollapsed = useAppSelector((state) => state.display.navCollapsed ?? false);

  // Raw slices needed for export/import and step normalization check
  const rawPeers = useAppSelector((state) => state.peer);
  const rawLinks = useAppSelector((state) => state.link);
  const rawObstacles = useAppSelector((state) => state.obstacle);
  const manualSteps = useAppSelector((state) => state.step);
  const texts = useAppSelector((state) => state.text);

  // Derived state via memoized selectors
  const entities = useAppSelector(selectEntities);
  const normalizedManualSteps = useAppSelector(selectNormalizedSteps);
  const steps = useAppSelector(selectSteps);
  const selectedSource = useAppSelector(selectSelectedSource);
  const isSimulationActive = useAppSelector(selectIsSimulationActive);
  const currentSimulationStepResult = useAppSelector(selectCurrentSimulationStepResult);
  const currentSimulationEvents = useAppSelector(selectCurrentSimulationEvents);
  const normalizedCurrentEventIndex = useAppSelector(selectNormalizedCurrentEventIndex);
  const currentSimulationEvent = useAppSelector(selectCurrentSimulationEvent);

  const simulationIsRunning = useAppSelector((state) => state.simulation.isRunning);
  const simulationInspectionMode = useAppSelector((state) => state.simulation.inspectionMode);
  const simulationResult = useAppSelector((state) => state.simulation.result);
  const simulationCurrentStepIndex = useAppSelector((state) => state.simulation.currentStepIndex);
  const simulationCurrentEventIndex = useAppSelector((state) => state.simulation.currentEventIndex);

  const invalidateSimulation = useCallback(() => {
    dispatch(clearSimulation());
  }, [dispatch]);

  const setDisplaySelectedId = useCallback(
    (id: UUID | null) => {
      dispatch(setSelectedId(id));
    },
    [dispatch],
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

  useEffect(() => {
    if (normalizedManualSteps.length !== manualSteps.length) {
      dispatch(replaceSteps(normalizedManualSteps));
    }
  }, [dispatch, manualSteps.length, normalizedManualSteps]);

  const setSteps = useCallback(
    (nextSteps: Step[]) => {
      invalidateSimulation();
      dispatch(replaceSteps(normalizeManualSteps(nextSteps, entities)));
    },
    [dispatch, entities, invalidateSimulation],
  );

  const setEntities = useCallback(
    (value: NetworkEntity[]) => {
      invalidateSimulation();
      dispatch(replacePeers(value.filter((e): e is PeerEntity => e.type === EntityType.Peer)));
      dispatch(replaceLinks(value.filter((e): e is LinkEntity => e.type === EntityType.Link)));
      dispatch(
        replaceObstacles(value.filter((e): e is ObstacleEntity => e.type === EntityType.Obstacle)),
      );
    },
    [dispatch, invalidateSimulation],
  );

  const setTexts = useCallback(
    (value: TextItem[]) => {
      dispatch(replaceTexts(value));
    },
    [dispatch],
  );

  const clearSelection = useCallback(() => {
    setDisplaySelectedId(null);
  }, [setDisplaySelectedId]);

  const toggleNavCollapse = useCallback(() => {
    dispatch(toggleNavCollapsed());
  }, [dispatch]);

  const handleEntitySelect = useCallback(
    (id: UUID) => {
      if (selectedSource === SelectionSource.Entities && selectedId === id) {
        clearSelection();
        return;
      }

      setDisplaySelectedId(id);
    },
    [clearSelection, selectedId, selectedSource, setDisplaySelectedId],
  );

  const handleWorkspaceEntitySelect = useCallback(
    (id: UUID) => {
      setDisplaySelectedId(id);
    },
    [setDisplaySelectedId],
  );

  const handleWorkspaceStepSelect = useCallback(
    (id: UUID) => {
      if (simulationResult) {
        const stepIndex = simulationResult.stepResults.findIndex(
          (stepResult) => stepResult.step.id === id,
        );
        if (stepIndex !== -1) {
          dispatch(setCurrentStepIndex(stepIndex));
        }
      }

      setDisplaySelectedId(id);
    },
    [dispatch, setDisplaySelectedId, simulationResult],
  );

  const handleStepSelect = useCallback(
    (id: UUID) => {
      if (selectedSource === SelectionSource.Steps && selectedId === id) {
        clearSelection();
        return;
      }

      if (simulationResult) {
        const stepIndex = simulationResult.stepResults.findIndex(
          (stepResult) => stepResult.step.id === id,
        );
        if (stepIndex !== -1) {
          dispatch(setCurrentStepIndex(stepIndex));
        }
      }

      setDisplaySelectedId(id);
    },
    [clearSelection, dispatch, selectedId, selectedSource, setDisplaySelectedId, simulationResult],
  );

  const handlePlacementModeChange = useCallback(
    (mode: ToolbarPlacementMode) => {
      dispatch(setPlacementMode(mode));
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
    invalidateSimulation();
    clearSelection();
    showToast("Started a new simulation");
  }, [
    clearSelection,
    dispatch,
    entities.length,
    invalidateSimulation,
    manualSteps.length,
    showToast,
  ]);

  const handleExportWorkspace = useCallback(() => {
    const payload: WorkspaceImportPayload = {
      peers: rawPeers,
      links: rawLinks,
      obstacles: rawObstacles,
      steps: sanitizeManualSteps(manualSteps, entities),
      texts,
      display,
    };

    exportState(payload);
    showToast("Workspace exported as JSON");
  }, [display, manualSteps, rawLinks, rawObstacles, rawPeers, showToast, texts]);

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

        invalidateSimulation();
        dispatch(replacePeers(payload.peers));
        dispatch(replaceLinks(payload.links));
        dispatch(replaceObstacles(payload.obstacles));
        dispatch(
          replaceSteps(
            sanitizeManualSteps(payload.steps, [
              ...payload.peers,
              ...payload.links,
              ...payload.obstacles,
            ]),
          ),
        );
        dispatch(replaceTexts(payload.texts));
        dispatch(clearState());
        dispatch(replaceDisplay(payload.display));
        showToast("Workspace imported successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import workspace";
        showToast(message);
      }
    },
    [dispatch, invalidateSimulation, showToast],
  );

  const focusSimulationStep = useCallback(
    (stepIndex: number, result: SimulationResult) => {
      const step = result.stepResults[stepIndex]?.step;
      if (!step) {
        return;
      }

      setDisplaySelectedId(step.id);
    },
    [setDisplaySelectedId],
  );

  const handleRunSimulation = useCallback(() => {
    if (simulationRunLockRef.current || simulationIsRunning) {
      showToast("Simulation is already running");
      return;
    }

    if (steps.length === 0) {
      showToast("Add at least one step before running the simulation");
      return;
    }

    simulationRunLockRef.current = true;
    dispatch(setIsRunning(true));

    try {
      const manager = SimulationManager.prepare({ entities, steps } as SimulationInput);
      const result = manager.run();

      dispatch(setInspectionMode(ToolbarMode.PacketStructure as SimulationInspectionMode));
      dispatch(simulationCompleted(result));
      focusSimulationStep(0, result);
      showToast(`Simulation finished with ${result.events.length} events`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      dispatch(setIsRunning(false));
      showToast(message);
    } finally {
      simulationRunLockRef.current = false;
    }
  }, [dispatch, entities, focusSimulationStep, showToast, simulationIsRunning, steps]);

  const navigateSimulationStep = useCallback(
    (direction: -1 | 1) => {
      if (!simulationResult) {
        return;
      }

      const nextStepIndex = simulationCurrentStepIndex + direction;
      if (nextStepIndex < 0 || nextStepIndex >= simulationResult.stepResults.length) {
        return;
      }

      dispatch(setCurrentStepIndex(nextStepIndex));
      focusSimulationStep(nextStepIndex, simulationResult);
    },
    [dispatch, focusSimulationStep, simulationCurrentStepIndex, simulationResult],
  );

  const handlePrevSimulationStep = useCallback(() => {
    navigateSimulationStep(-1);
  }, [navigateSimulationStep]);

  const handleNextSimulationStep = useCallback(() => {
    navigateSimulationStep(1);
  }, [navigateSimulationStep]);

  const handleSimulationInspectionModeChange = useCallback(
    (mode: ToolbarMode) => {
      dispatch(setInspectionMode(mode as SimulationInspectionMode));
    },
    [dispatch],
  );

  const handleStopSimulation = useCallback(() => {
    invalidateSimulation();
    showToast("Simulation stopped");
  }, [invalidateSimulation, showToast]);

  useEffect(() => {
    if (!selectedId || selectedSource !== null) {
      return;
    }

    setDisplaySelectedId(null);
  }, [selectedId, selectedSource, setDisplaySelectedId]);

  const isStepPlacementMode =
    placementMode === PlacementMode.Message ||
    placementMode === PlacementMode.Move ||
    placementMode === PlacementMode.Toggle;

  const handlePrevSimulationEvent = useCallback(() => {
    dispatch(setCurrentEventIndex(Math.max(0, simulationCurrentEventIndex - 1)));
  }, [dispatch, simulationCurrentEventIndex]);

  const handleNextSimulationEvent = useCallback(() => {
    dispatch(
      setCurrentEventIndex(
        currentSimulationEvents.length === 0
          ? 0
          : Math.min(currentSimulationEvents.length - 1, simulationCurrentEventIndex + 1),
      ),
    );
  }, [currentSimulationEvents.length, dispatch, simulationCurrentEventIndex]);

  return {
    canGoNextEvent:
      currentSimulationEvents.length > 0 &&
      normalizedCurrentEventIndex < currentSimulationEvents.length - 1,
    canGoNextStep:
      simulationResult !== null &&
      simulationCurrentStepIndex < simulationResult.stepResults.length - 1,
    canGoPrevEvent: normalizedCurrentEventIndex > 0,
    canGoPrevStep: simulationCurrentStepIndex > 0,
    canRunSimulation: !simulationIsRunning,
    currentSimulationEvent,
    currentSimulationEventIndex: normalizedCurrentEventIndex,
    currentSimulationEvents,
    currentSimulationStepResult,
    entities,
    handleNextSimulationEvent,
    handleNextSimulationStep,
    isNavCollapsed,
    isStepPlacementMode,
    manualSteps,
    placementMode,
    selectedId,
    selectedSource,
    openedTabs,
    isRefreshHidden,
    setEntitiesOpened,
    setStepsOpened,
    setStepsRefreshHidden,
    setEntities,
    setSteps,
    setTexts,
    steps,
    texts,
    toggleNavCollapse,
    handleEntitySelect,
    handleExportWorkspace,
    handleImportWorkspace,
    handlePrevSimulationStep,
    handlePrevSimulationEvent,
    handleNewWorkspace,
    handlePlacementModeChange,
    handleRunSimulation,
    handleStopSimulation,
    handleStepSelect,
    isSimulationActive,
    handleWorkspaceEntitySelect,
    handleWorkspaceStepSelect,
    setSimulationInspectionMode: handleSimulationInspectionModeChange,
    simulationInspectionMode,
    clearSelection,
  };
}
