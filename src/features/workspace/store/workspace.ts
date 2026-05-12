import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { storageKeys } from "../../../shared/constants/storage";
import { useLocalStorage } from "../../../shared/hooks/storage/useLocalStorage";
import { useToast } from "../../../shared/toast/useToast";
import { runSimulation } from "../../../shared/simulation/processor/simulation";
import { PlacementMode, RoutingProtocol, SelectionSource, ToolbarMode } from "../../../shared/types/enums";
import type { NetworkEntity } from "../../../shared/types/entities";
import {
  SimulationEventType,
  type RoutingTableChangeDetails,
  type SimulationEvent,
  type SimulationPlaybackState,
} from "../../../shared/types/simulation";
import type { WorkflowStep } from "../../../shared/types/steps";
import type { ToolbarPlacementMode } from "../../../shared/types/toolbar";
import type { UUID } from "../../../shared/types/uuid";
import type { WorkspaceTextItem } from "../../../shared/types/workspace";
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
  const simulationRunLockRef = useRef(false);
  const [placementMode, setPlacementMode] = useState<ToolbarPlacementMode>(null);
  const [selectedId, setSelectedId] = useLocalStorage<UUID | null>(storageKeys.selectedId, null);
  const [selectedSource, setSelectedSource] = useLocalStorage<SelectionSource | null>(
    storageKeys.selectedSource,
    null,
  );
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const [rawEntities, setRawEntities] = useLocalStorage<NetworkEntity[]>(storageKeys.entities, []);
  const [manualSteps, setManualSteps] = useLocalStorage<WorkflowStep[]>(storageKeys.steps, []);
  const [rawTexts, setRawTexts] = useLocalStorage<WorkspaceTextItem[]>(storageKeys.textItems, []);
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

  const entities = rawEntities;
  const texts = rawTexts;

  const normalizedManualSteps = useMemo(() => normalizeManualSteps(manualSteps), [manualSteps]);
  const steps = useMemo(
    () => composeStepsWithRefresh(normalizedManualSteps, entities),
    [normalizedManualSteps, entities],
  );

  useEffect(() => {
    if (normalizedManualSteps.length !== manualSteps.length) {
      setManualSteps(normalizedManualSteps);
    }
  }, [manualSteps.length, normalizedManualSteps, setManualSteps]);

  const setSteps = useCallback(
    (nextSteps: WorkflowStep[]) => {
      invalidateSimulation();
      setManualSteps(normalizeManualSteps(nextSteps));
    },
    [invalidateSimulation, setManualSteps],
  );

  const setEntities = useCallback(
    (value: NetworkEntity[]) => {
      invalidateSimulation();
      setRawEntities(value);
    },
    [invalidateSimulation, setRawEntities],
  );

  const setTexts = useCallback(
    (value: WorkspaceTextItem[]) => {
      setRawTexts(value);
    },
    [setRawTexts],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedSource(null);
  }, [setSelectedId, setSelectedSource]);

  const toggleNavCollapse = useCallback(() => {
    setIsNavCollapsed((prev) => !prev);
  }, []);

  const handleEntitySelect = useCallback(
    (id: UUID) => {
      if (selectedSource === SelectionSource.Entities && selectedId === id) {
        clearSelection();
        return;
      }

      setSelectedId(id);
      setSelectedSource(SelectionSource.Entities);
    },
    [clearSelection, selectedId, selectedSource, setSelectedId, setSelectedSource],
  );

  const handleWorkspaceEntitySelect = useCallback(
    (id: UUID) => {
      setSelectedId(id);
      setSelectedSource(SelectionSource.Entities);
    },
    [setSelectedId, setSelectedSource],
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

      setSelectedId(id);
      setSelectedSource(SelectionSource.Steps);
    },
    [setSelectedId, setSelectedSource],
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

      setSelectedId(id);
      setSelectedSource(SelectionSource.Steps);
    },
    [clearSelection, selectedId, selectedSource, setSelectedId, setSelectedSource],
  );

  const handlePlacementModeChange = useCallback((mode: ToolbarPlacementMode) => {
    setPlacementMode(mode);
  }, []);

  const handleNewWorkspace = useCallback(() => {
    const hasData = entities.length > 0 || manualSteps.length > 0;

    if (hasData && !window.confirm("This action will clear all current entities and steps. Continue?")) {
      return;
    }

    setRawEntities([]);
    setManualSteps([]);
    setRawTexts([]);
    invalidateSimulation();
    clearSelection();
    showToast("Started a new simulation");
  }, [
    clearSelection,
    entities.length,
    invalidateSimulation,
    manualSteps.length,
    setRawEntities,
    setManualSteps,
    setRawTexts,
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

        const confirmed = window.confirm("Import action will clear the current environment and replace it with data from the file. Continue?");
        if (!confirmed) {
          return;
        }

        invalidateSimulation();
        setRawEntities(payload.entities);
        setManualSteps(sanitizeManualSteps(payload.steps));
        clearSelection();
        showToast("Workspace imported successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import workspace";
        showToast(message);
      }
    },
    [clearSelection, invalidateSimulation, setRawEntities, setManualSteps, showToast],
  );

  const focusSimulationStep = useCallback(
    (stepIndex: number, playback: SimulationPlaybackState) => {
      const step = playback.result?.stepResults[stepIndex]?.step;
      if (!step) {
        return;
      }

      setSelectedId(step.id);
      setSelectedSource(SelectionSource.Steps);
    },
    [setSelectedId, setSelectedSource],
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
      showToast((`Simulation finished with ${(result.events.length)} events`));
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
    if (selectedSource !== SelectionSource.Steps || !selectedId) {
      return;
    }

    const hasSelectedStep = steps.some((step) => step.id === selectedId);
    if (!hasSelectedStep) {
      clearSelection();
    }
  }, [clearSelection, selectedId, selectedSource, steps]);

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
