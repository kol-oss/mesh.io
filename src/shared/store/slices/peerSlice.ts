import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { UUID } from "@/shared/types/common/uuid";
import { PEER_STORAGE_KEY } from "@/shared/store/constants";
import { loadStates } from "@/shared/store/utils/storeUtils";
import { sanitizePeerEntities, sanitizePeerEntity } from "@/shared/utils/entities/sanitizers";

const initialState: PeerEntity[] = sanitizePeerEntities(loadStates<PeerEntity>(PEER_STORAGE_KEY));

const peerSlice = createSlice({
  name: "peers",
  initialState,
  reducers: {
    setPeer(state, action: PayloadAction<PeerEntity>) {
      const sanitizedPeer = sanitizePeerEntity(action.payload);
      const index = state.findIndex((peer) => peer.id === sanitizedPeer.id);
      if (index !== -1) {
        state[index] = sanitizedPeer;
      } else {
        state.push(sanitizedPeer);
      }
    },
    removePeer(state, action: PayloadAction<UUID>) {
      const index = state.findIndex((peer) => peer.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
    replacePeers(_state, action: PayloadAction<PeerEntity[]>) {
      return sanitizePeerEntities(action.payload);
    },
    clearPeers(state) {
      state.length = 0;
    },
  },
});

export const { setPeer, removePeer, replacePeers, clearPeers } = peerSlice.actions;
export default peerSlice.reducer;
