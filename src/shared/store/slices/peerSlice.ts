import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RoutingProtocol } from "../../types/enums";
import type { UUID } from "../../types/uuid";
import { PEER_STORAGE_KEY } from "../constants";
import { loadStates } from "../utils/storeUtils";

export interface PeerState {
  id: UUID;
  name: string;
  x: number;
  y: number;
  range: number;
  protocol: RoutingProtocol;
  enabled: boolean;
  locked: boolean;
  aodvHelloInterval: number;
  aodvRouteTimeout: number;
  batmanDistancePenaltyDistance: number;
  batmanDistancePenaltyPercent: number;
  batmanElpInterval: number;
  batmanOgmInterval: number;
  batmanPurgeTimeout: number;
  dsdvFullDumpInterval: number;
  dsdvIncrementalUpdateInterval: number;
  dsdvRouteTimeout: number;
  olsrHelloInterval: number;
  olsrTcInterval: number;
}

const initialState: PeerState[] = loadStates<PeerState>(PEER_STORAGE_KEY);

const peerSlice = createSlice({
  name: "peers",
  initialState,
  reducers: {
    setPeer(state, action: PayloadAction<PeerState>) {
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
    clearPeers(state) {
      state.length = 0;
    },
  },
});

export const { setPeer, removePeer, clearPeers } = peerSlice.actions;
export default peerSlice.reducer;
