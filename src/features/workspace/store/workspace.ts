import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "../../../shared/store/hooks";
import {
  TABS,
  setOpenedTab,
  setRefreshHidden,
  setSelectedId,
} from "../../../shared/store/slices/displaySlice";
import { clearPeers, replacePeers } from "../../../shared/store/slices/peerSlice";
import { clearLinks, replaceLinks } from "../../../shared/store/slices/linkSlice";
import { clearObstacles, replaceObstacles } from "../../../shared/store/slices/obstacleSlice";
import { clearSteps, replaceSteps } from "../../../shared/store/slices/stepSlice";
import { clearTexts, replaceTexts } from "../../../shared/store/slices/textSlice";
import { useToast } from "../../../shared/toast/useToast";
import { runSimulation } from "../../../shared/simulation/processor/simulation";
import {
  PlacementMode,
  RoutingProtocol,
  SelectionSource,
  ToolbarMode,
} from "../../../shared/types/enums";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "../../../shared/types/entities";
import { EntityType } from "../../../shared/types/enums";
import {
  SimulationEventType,
  type RoutingTableChangeDetails,
  type SimulationEvent,
  type SimulationPlaybackState,
} from "../../../shared/types/simulation";
import type { WorkflowStep } from "../../../shared/types/steps";
import type { ToolbarPlacementMode } from "../../../shared/types/toolbar";
import type { UUID } from "../../../shared/types/uuid";
import type { WorkspaceTextItem } from "../../../shared/types/workspace/text";
import {
  composeStepsWithRefresh,
  normalizeManualSteps,
  sanitizeManualSteps,
} from "../../../shared/utils/navigation/refreshSteps";
import {
  getWorkspaceExportFileName,
  parseWorkspaceImportPayload,
  type WorkspaceImportPayload,
} from "../../../shared/utils/validation";

const downloadWorkspacePayload = (payload: WorkspaceImportPayload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getWorkspaceExportFileName();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const collapseOriginatorInsertUpdateEvents = (events: SimulationEvent[]) => {
  const skipIds = new Set<string>();

  for (let index = 0; index < events.length - 1; index += 1) {
    const current = events[index];
    const next = events[index + 1];
    if (
      current.type !== SimulationEventType.RoutingTableInsert ||
      next.type !== SimulationEventType.RoutingTableUpdate
    ) {
      continue;
    }

    if (current.peerId !== next.peerId) {
      continue;
    }

    const currentDetails = current.details as RoutingTableChangeDetails;
    const nextDetails = next.details as RoutingTableChangeDetails;
    if (
      currentDetails.protocol !== RoutingProtocol.BATMAN ||
      nextDetails.protocol !== RoutingProtocol.BATMAN
    ) {
      continue;
    }

    if (
      currentDetails.originatorPeerId !== nextDetails.originatorPeerId ||
      currentDetails.hopPeerId !== nextDetails.hopPeerId
    ) {
      continue;
    }

    skipIds.add(current.id);
  }

  return events.filter((event) => !skipIds.has(event.id));
};

export function useWorkspaceStore() {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const simulationRunLockRef = useRef(false);
  const [placementMode, setPlacementMode] = useState<ToolbarPlacementMode>(null);
  const selectedId = useAppSelector((state) => state.display.selectedId);
  const openedTabs = useAppSelector((state) => state.display.openedTabs);
  const isRefreshHidden = useAppSelector((state) => state.display.refreshHidden);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const rawPeers = useAppSelector((state) => state.peer);
  const rawLinks = useAppSelector((state) => state.link);
  const rawObstacles = useAppSelector((state) => state.obstacle);
  const manualSteps = useAppSelector((state) => state.step);
  const texts = useAppSelector((state) => state.text);
  const [simulationPlayback, setSimulationPlayback] = useState<SimulationPlaybackState>({
    result: null,
    currentStepIndex: 0,
    currentEventIndex: 0,
    isRunning: false,
  });
  const [simulationInspectionMode, setSimulationInspectionMode] = useState<ToolbarMode>(
    ToolbarMode.PacketStructure,
  );

  const invalidateSimulation = useCallback(() => {
    setSimulationPlayback({
      result: null,
      currentStepIndex: 0,
      currentEventIndex: 0,
      isRunning: false,
    });
  }, []);

  const entities = useMemo<NetworkEntity[]>(
    () => [...rawPeers, ...rawLinks, ...rawObstacles],
    [rawPeers, rawLinks, rawObstacles],
  );

  const normalizedManualSteps = useMemo(() => normalizeManualSteps(manualSteps), [manualSteps]);
  const steps = useMemo(
    () => composeStepsWithRefresh(normalizedManualSteps, entities),
    [normalizedManualSteps, entities],
  );

  const selectedSource = useMemo<SelectionSource | null>(() => {
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
    (nextSteps: WorkflowStep[]) => {
      invalidateSimulation();
      dispatch(replaceSteps(normalizeManualSteps(nextSteps)));
    },
    [dispatch, invalidateSimulation],
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
    (value: WorkspaceTextItem[]) => {
      dispatch(replaceTexts(value));
    },
    [dispatch],
  );

  const clearSelection = useCallback(() => {
    setDisplaySelectedId(null);
  }, [setDisplaySelectedId]);

  const toggleNavCollapse = useCallback(() => {
    setIsNavCollapsed((prev) => !prev);
  }, []);

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
      setSimulationPlayback((prev) => {
        if (!prev.result) {
          return prev;
        }

        const stepIndex = prev.result.stepResults.findIndex(
          (stepResult) => stepResult.step.id === id,
        );
        if (stepIndex === -1) {
          return prev;
        }

        return {
          ...prev,
          currentStepIndex: stepIndex,
          currentEventIndex: 0,
        };
      });

      setDisplaySelectedId(id);
    },
    [setDisplaySelectedId],
  );

  const handleStepSelect = useCallback(
    (id: UUID) => {
      if (selectedSource === SelectionSource.Steps && selectedId === id) {
        clearSelection();
        return;
      }

      setSimulationPlayback((prev) => {
        if (!prev.result) {
          return prev;
        }

        const stepIndex = prev.result.stepResults.findIndex(
          (stepResult) => stepResult.step.id === id,
        );
        if (stepIndex === -1) {
          return prev;
        }

        return {
          ...prev,
          currentStepIndex: stepIndex,
          currentEventIndex: 0,
        };
      });

      setDisplaySelectedId(id);
    },
    [clearSelection, selectedId, selectedSource, setDisplaySelectedId],
  );

  const handlePlacementModeChange = useCallback((mode: ToolbarPlacementMode) => {
    setPlacementMode(mode);
  }, []);

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
      entities,
      steps: sanitizeManualSteps(manualSteps),
    };

    downloadWorkspacePayload(payload);
    showToast("Workspace exported as JSON");
  }, [entities, manualSteps, showToast]);

  const handleImportWorkspace = useCallback(
    async (file: File) => {
      try {
        const raw = await file.text();
        const payload = parseWorkspaceImportPayload(raw);

        const confirmed = window.confirm(
          "Import action will clear the current environment and replace it with data from the file. Continue?",
        );
        if (!confirmed) {
          return;
        }

        invalidateSimulation();
        dispatch(
          replacePeers(payload.entities.filter((e): e is PeerEntity => e.type === EntityType.Peer)),
        );
        dispatch(
          replaceLinks(payload.entities.filter((e): e is LinkEntity => e.type === EntityType.Link)),
        );
        dispatch(
          replaceObstacles(
            payload.entities.filter((e): e is ObstacleEntity => e.type === EntityType.Obstacle),
          ),
        );
        dispatch(replaceSteps(sanitizeManualSteps(payload.steps)));
        clearSelection();
        showToast("Workspace imported successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import workspace";
        showToast(message);
      }
    },
    [clearSelection, dispatch, invalidateSimulation, showToast],
  );

  const focusSimulationStep = useCallback(
    (stepIndex: number, playback: SimulationPlaybackState) => {
      const step = playback.result?.stepResults[stepIndex]?.step;
      if (!step) {
        return;
      }

      setDisplaySelectedId(step.id);
    },
    [setDisplaySelectedId],
  );

  const handleRunSimulation = useCallback(() => {
    if (simulationRunLockRef.current || simulationPlayback.isRunning) {
      showToast("Simulation is already running");
      return;
    }

    if (steps.length === 0) {
      showToast("Add at least one step before running the simulation");
      return;
    }

    simulationRunLockRef.current = true;
    setSimulationPlayback((prev) => ({ ...prev, isRunning: true }));

    try {
      const result = runSimulation({ entities, steps });
      const nextPlayback: SimulationPlaybackState = {
        result,
        currentStepIndex: 0,
        currentEventIndex: 0,
        isRunning: false,
      };

      setSimulationInspectionMode(ToolbarMode.PacketStructure);
      setSimulationPlayback(nextPlayback);
      focusSimulationStep(0, nextPlayback);
      showToast(`Simulation finished with ${result.events.length} events`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Simulation failed";
      setSimulationPlayback((prev) => ({ ...prev, isRunning: false }));
      showToast(message);
    } finally {
      simulationRunLockRef.current = false;
    }
  }, [entities, focusSimulationStep, showToast, simulationPlayback.isRunning, steps]);

  const navigateSimulationStep = useCallback(
    (direction: -1 | 1) => {
      if (!simulationPlayback.result) {
        return;
      }

      const nextStepIndex = simulationPlayback.currentStepIndex + direction;
      if (nextStepIndex < 0 || nextStepIndex >= simulationPlayback.result.stepResults.length) {
        return;
      }

      const nextPlayback: SimulationPlaybackState = {
        ...simulationPlayback,
        currentStepIndex: nextStepIndex,
        currentEventIndex: 0,
      };

      setSimulationPlayback(nextPlayback);
      focusSimulationStep(nextStepIndex, nextPlayback);
    },
    [focusSimulationStep, simulationPlayback],
  );

  const handlePrevSimulationStep = useCallback(() => {
    navigateSimulationStep(-1);
  }, [navigateSimulationStep]);

  const handleNextSimulationStep = useCallback(() => {
    navigateSimulationStep(1);
  }, [navigateSimulationStep]);

  const handleSimulationInspectionModeChange = useCallback((mode: ToolbarMode) => {
    setSimulationInspectionMode(mode);
  }, []);

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

  const currentSimulationStepResult =
    simulationPlayback.result?.stepResults[simulationPlayback.currentStepIndex] ?? null;
  const isSimulationActive = simulationPlayback.result !== null;
  const currentSimulationEvents = useMemo(() => {
    if (!currentSimulationStepResult) {
      return [];
    }

    const collapsedEvents = collapseOriginatorInsertUpdateEvents(
      currentSimulationStepResult.events,
    );

    return collapsedEvents;
  }, [currentSimulationStepResult]);
  const normalizedCurrentEventIndex =
    currentSimulationEvents.length === 0
      ? 0
      : Math.min(simulationPlayback.currentEventIndex, currentSimulationEvents.length - 1);
  const currentSimulationEvent = currentSimulationEvents[normalizedCurrentEventIndex] ?? null;

  const handlePrevSimulationEvent = useCallback(() => {
    setSimulationPlayback((prev) => ({
      ...prev,
      currentEventIndex: Math.max(0, prev.currentEventIndex - 1),
    }));
  }, []);

  const handleNextSimulationEvent = useCallback(() => {
    setSimulationPlayback((prev) => ({
      ...prev,
      currentEventIndex:
        currentSimulationEvents.length === 0
          ? 0
          : Math.min(currentSimulationEvents.length - 1, prev.currentEventIndex + 1),
    }));
  }, [currentSimulationEvents.length]);

  return {
    canGoNextEvent:
      currentSimulationEvents.length > 0 &&
      normalizedCurrentEventIndex < currentSimulationEvents.length - 1,
    canGoNextStep:
      simulationPlayback.result !== null &&
      simulationPlayback.currentStepIndex < simulationPlayback.result.stepResults.length - 1,
    canGoPrevEvent: normalizedCurrentEventIndex > 0,
    canGoPrevStep: simulationPlayback.currentStepIndex > 0,
    canRunSimulation: !simulationPlayback.isRunning,
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
    simulationPlayback,
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
