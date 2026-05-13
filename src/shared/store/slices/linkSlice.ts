import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LinkEntity } from "../../types/entities";
import type { UUID } from "../../types/uuid";
import { LINK_STORAGE_KEY } from "../constants";
import { loadStates } from "../utils/storeUtils";

const initialState: LinkEntity[] = loadStates<LinkEntity>(LINK_STORAGE_KEY);

const linkSlice = createSlice({
  name: "links",
  initialState,
  reducers: {
    setLink(state, action: PayloadAction<LinkEntity>) {
      const index = state.findIndex((link) => link.id === action.payload.id);
      if (index !== -1) {
        state[index] = action.payload;
      } else {
        state.push(action.payload);
      }
    },
    removeLink(state, action: PayloadAction<UUID>) {
      const index = state.findIndex((link) => link.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
    replaceLinks(_state, action: PayloadAction<LinkEntity[]>) {
      return action.payload;
    },
    clearLinks(state) {
      state.length = 0;
    },
  },
});

export const { setLink, removeLink, replaceLinks, clearLinks } = linkSlice.actions;
export default linkSlice.reducer;
