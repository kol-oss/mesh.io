import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PeerEntity } from "../../types/entities";
import type { UUID } from "../../types/uuid";
import { PEER_STORAGE_KEY } from "../constants";
import { loadStates } from "../utils/storeUtils";

const initialState: PeerEntity[] = loadStates<PeerEntity>(PEER_STORAGE_KEY);

const peerSlice = createSlice({
  name: "peers",
  initialState,
  reducers: {
    setPeer(state, action: PayloadAction<PeerEntity>) {
      const index = state.findIndex((peer) => peer.id === action.payload.id);
      if (index !== -1) {
        state[index] = action.payload;
      } else {
        state.push(action.payload);
      }
    },
    removePeer(state, action: PayloadAction<UUID>) {
      const index = state.findIndex((peer) => peer.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
    replacePeers(_state, action: PayloadAction<PeerEntity[]>) {
      return action.payload;
    },
    clearPeers(state) {
      state.length = 0;
    },
  },
});

export const { setPeer, removePeer, replacePeers, clearPeers } = peerSlice.actions;
export default peerSlice.reducer;
