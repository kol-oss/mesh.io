import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { UUID } from "../../types/uuid";
import type { WorkspaceTextItem } from "../../types/workspace";
import { TEXT_STORAGE_KEY } from "../constants";
import { loadStates } from "../utils/storeUtils";

const initialState: WorkspaceTextItem[] = loadStates<WorkspaceTextItem>(TEXT_STORAGE_KEY);

const textSlice = createSlice({
  name: "texts",
  initialState,
  reducers: {
    setText(state, action: PayloadAction<WorkspaceTextItem>) {
      const index = state.findIndex((text) => text.id === action.payload.id);
      if (index !== -1) {
        state[index] = action.payload;
      } else {
        state.push(action.payload);
      }
    },
    removeText(state, action: PayloadAction<UUID>) {
      const index = state.findIndex((text) => text.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
    replaceTexts(_state, action: PayloadAction<WorkspaceTextItem[]>) {
      return action.payload;
    },
    clearTexts(state) {
      state.length = 0;
    },
  },
});

export const { setText, removeText, replaceTexts, clearTexts } = textSlice.actions;
export default textSlice.reducer;
