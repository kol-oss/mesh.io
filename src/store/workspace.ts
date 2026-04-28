import { useCallback, useEffect, useMemo, useState } from "react";

import { storageKeys } from "../constants/storage";
import { useLocalStorage } from "../hooks/storage/useLocalStorage";
import { useToast } from "../hooks/useToast";
import { PlacementMode, SelectionSource } from "../types/enums";
import type { NetworkEntity } from "../types/entities";
import type { WorkflowStep } from "../types/steps";
import type { ToolbarPlacementMode } from "../types/toolbar";
import type { WorkspaceTextItem } from "../types/workspace";
import { composeStepsWithRefresh, sanitizeManualSteps } from "../utils/navigation/refreshSteps";
import {
  getWorkspaceExportFileName,
  parseWorkspaceImportPayload,
  type WorkspaceImportPayload,
} from "../utils/validation";

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

export function useWorkspaceStore() {
  const { showToast } = useToast();
  const [placementMode, setPlacementMode] = useState<ToolbarPlacementMode>(null);
  const [selectedId, setSelectedId] = useLocalStorage<string | null>(storageKeys.selectedId, null);
  const [selectedSource, setSelectedSource] = useLocalStorage<SelectionSource | null>(
    storageKeys.selectedSource,
    null,
  );
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  const [entities, setEntities] = useLocalStorage<NetworkEntity[]>(storageKeys.entities, []);
  const [manualSteps, setManualSteps] = useLocalStorage<WorkflowStep[]>(storageKeys.steps, []);
  const [texts, setTexts] = useLocalStorage<WorkspaceTextItem[]>(storageKeys.textItems, []);

  const normalizedManualSteps = useMemo(() => sanitizeManualSteps(manualSteps), [manualSteps]);
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
      setManualSteps(sanitizeManualSteps(nextSteps));
    },
    [setManualSteps],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedSource(null);
  }, [setSelectedId, setSelectedSource]);

  const toggleNavCollapse = useCallback(() => {
    setIsNavCollapsed((prev) => !prev);
  }, []);

  const handleEntitySelect = useCallback(
    (id: string) => {
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
    (id: string) => {
      setSelectedId(id);
      setSelectedSource(SelectionSource.Entities);
    },
    [setSelectedId, setSelectedSource],
  );

  const handleWorkspaceStepSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSelectedSource(SelectionSource.Steps);
    },
    [setSelectedId, setSelectedSource],
  );

  const handleStepSelect = useCallback(
    (id: string) => {
      if (selectedSource === SelectionSource.Steps && selectedId === id) {
        clearSelection();
        return;
      }

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

    if (
      hasData &&
      !window.confirm("This action will clear all current entities and steps. Continue?")
    ) {
      return;
    }

    setEntities([]);
    setManualSteps([]);
    setTexts([]);
    clearSelection();
    showToast("Started a new simulation");
  }, [
    clearSelection,
    entities.length,
    manualSteps.length,
    setEntities,
    setManualSteps,
    setTexts,
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

        setEntities(payload.entities);
        setManualSteps(sanitizeManualSteps(payload.steps));
        clearSelection();
        showToast("Workspace imported successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import workspace";
        showToast(message);
      }
    },
    [clearSelection, setEntities, setManualSteps, showToast],
  );

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

  return {
    entities,
    isNavCollapsed,
    isStepPlacementMode,
    manualSteps,
    placementMode,
    selectedId,
    selectedSource,
    setEntities,
    setSteps,
    setTexts,
    steps,
    texts,
    toggleNavCollapse,
    handleEntitySelect,
    handleExportWorkspace,
    handleImportWorkspace,
    handleNewWorkspace,
    handlePlacementModeChange,
    handleStepSelect,
    handleWorkspaceEntitySelect,
    handleWorkspaceStepSelect,
    clearSelection,
  };
}
