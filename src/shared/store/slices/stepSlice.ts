import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { WorkflowStep } from "../../types/steps";
import type { UUID } from "../../types/uuid";
import { STEP_STORAGE_KEY } from "../constants";
import { loadStates } from "../utils/storeUtils";

export type StepState = WorkflowStep;

const initialState: StepState[] = loadStates<StepState>(STEP_STORAGE_KEY);

const stepSlice = createSlice({
  name: "steps",
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<StepState>) {
      const index = state.findIndex((step) => step.id === action.payload.id);
      if (index !== -1) {
        state[index] = action.payload;
      } else {
        state.push(action.payload);
      }
    },
    removeStep(state, action: PayloadAction<UUID>) {
      const index = state.findIndex((step) => step.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
    replaceSteps(_state, action: PayloadAction<StepState[]>) {
      return action.payload;
    },
    clearSteps(state) {
      state.length = 0;
    },
  },
});

export const { setStep, removeStep, replaceSteps, clearSteps } = stepSlice.actions;
export default stepSlice.reducer;
