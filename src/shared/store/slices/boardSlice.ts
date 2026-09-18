import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ToolbarPlacementMode } from "@/shared/types/action";

export interface BoardState {
  placementMode: ToolbarPlacementMode;
}

const initialState: BoardState = {
  placementMode: null,
};

const boardSlice = createSlice({
  name: "board",
  initialState,
  reducers: {
    setPlacementMode(state, action: PayloadAction<ToolbarPlacementMode>) {
      state.placementMode = action.payload;
    },
    clearPlacementMode(state) {
      state.placementMode = null;
    },
  },
});

export const { setPlacementMode, clearPlacementMode } = boardSlice.actions;
export default boardSlice.reducer;
