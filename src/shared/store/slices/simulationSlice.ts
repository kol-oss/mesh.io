import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { ActionMode } from "@/shared/types/action";
import type { SimulationResult } from "@/shared/types/model/simulation";

export type SimulationInspectionMode = ActionMode.PacketStructure | ActionMode.RoutingTable;

export interface SimulationState {
  result: SimulationResult | null;
  currentStepIndex: number;
  currentEventIndex: number;
  isRunning: boolean;
  inspectionMode: SimulationInspectionMode;
}

const initialState: SimulationState = {
  result: null,
  currentStepIndex: 0,
  currentEventIndex: 0,
  isRunning: false,
  inspectionMode: ActionMode.PacketStructure,
};

const simulationSlice = createSlice({
  name: "simulation",
  initialState,
  reducers: {
    /** Called when simulation finishes successfully. Stores the result and resets navigation. */
    simulationCompleted(state, action: PayloadAction<SimulationResult>) {
      state.result = action.payload;
      state.currentStepIndex = 0;
      state.currentEventIndex = 0;
      state.isRunning = false;
    },
    /** Resets the entire simulation state back to the initial empty state. */
    clearSimulation(state) {
      state.result = null;
      state.currentStepIndex = 0;
      state.currentEventIndex = 0;
      state.isRunning = false;
    },
    setIsRunning(state, action: PayloadAction<boolean>) {
      state.isRunning = action.payload;
    },
    /** Navigates to a step by index and resets the event cursor to 0. */
    setCurrentStepIndex(state, action: PayloadAction<number>) {
      state.currentStepIndex = action.payload;
      state.currentEventIndex = 0;
    },
    setCurrentEventIndex(state, action: PayloadAction<number>) {
      state.currentEventIndex = action.payload;
    },
    setInspectionMode(state, action: PayloadAction<SimulationInspectionMode>) {
      state.inspectionMode = action.payload;
    },
  },
});

export const {
  simulationCompleted,
  clearSimulation,
  setIsRunning,
  setCurrentStepIndex,
  setCurrentEventIndex,
  setInspectionMode,
} = simulationSlice.actions;

export default simulationSlice.reducer;
