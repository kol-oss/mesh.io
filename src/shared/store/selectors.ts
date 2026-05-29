import { createSelector } from "@reduxjs/toolkit";

import type { RootState } from "@/shared/store/store";
import type { NetworkEntity } from "@/shared/types/model/entities";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import {
  composeStepsWithRefresh,
  normalizeManualSteps,
} from "@/shared/utils/navigation/refreshSteps";
import { collapseOriginatorInsertUpdateEvents } from "@/shared/utils/simulation/collapseEvents";

// ─── Entity / step selectors ─────────────────────────────────────────────────

export const selectEntities = createSelector(
  (state: RootState) => state.peer,
  (state: RootState) => state.link,
  (state: RootState) => state.obstacle,
  (peers, links, obstacles): NetworkEntity[] => [...peers, ...links, ...obstacles],
);

export const selectNormalizedSteps = createSelector(
  (state: RootState) => state.step,
  selectEntities,
  (steps, entities) => normalizeManualSteps(steps, entities),
);

export const selectSteps = createSelector(
  selectNormalizedSteps,
  selectEntities,
  (normalizedSteps, entities) => composeStepsWithRefresh(normalizedSteps, entities),
);

export const selectSelectedSource = createSelector(
  (state: RootState) => state.display.selectedId,
  selectEntities,
  selectSteps,
  (selectedId, entities, steps) => {
    if (!selectedId) return null;
    if (entities.some((e) => e.id === selectedId)) return SelectionSource.Entities;
    if (steps.some((s) => s.id === selectedId)) return SelectionSource.Steps;
    return null;
  },
);

// ─── Simulation selectors ─────────────────────────────────────────────────────

export const selectIsSimulationActive = (state: RootState): boolean =>
  state.simulation.result !== null;

export const selectCurrentSimulationStepResult = createSelector(
  (state: RootState) => state.simulation.result,
  (state: RootState) => state.simulation.currentStepIndex,
  (result, currentStepIndex) => result?.stepResults[currentStepIndex] ?? null,
);

export const selectCurrentSimulationEvents = createSelector(
  selectCurrentSimulationStepResult,
  (stepResult) => (stepResult ? collapseOriginatorInsertUpdateEvents(stepResult.events) : []),
);

export const selectNormalizedCurrentEventIndex = createSelector(
  selectCurrentSimulationEvents,
  (state: RootState) => state.simulation.currentEventIndex,
  (events, index) => (events.length === 0 ? 0 : Math.min(index, events.length - 1)),
);

export const selectCurrentSimulationEvent = createSelector(
  selectCurrentSimulationEvents,
  selectNormalizedCurrentEventIndex,
  (events, index) => events[index] ?? null,
);
