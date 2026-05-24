import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { TEXT_STORAGE_KEY } from "@/shared/store/constants";
import { loadStates } from "@/shared/store/utils/storeUtils";
import type { UUID } from "@/shared/types/common/uuid";
import type { TextItem } from "@/shared/types/workspace/text";

const initialState: TextItem[] = loadStates<TextItem>(TEXT_STORAGE_KEY);

const textSlice = createSlice({
  name: "texts",
  initialState,
  reducers: {
    setText(state, action: PayloadAction<TextItem>) {
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
    replaceTexts(_state, action: PayloadAction<TextItem[]>) {
      return action.payload;
    },
    clearTexts(state) {
      state.length = 0;
    },
  },
});

export const { setText, removeText, replaceTexts, clearTexts } = textSlice.actions;
export default textSlice.reducer;
