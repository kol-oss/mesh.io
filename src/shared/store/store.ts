import { configureStore } from "@reduxjs/toolkit";

import { DISPLAY_STORAGE_KEY, PEER_STORAGE_KEY, STEP_STORAGE_KEY } from "./constants";
import peerReducer from "./slices/peerSlice";
import stepReducer from "./slices/stepSlice";
import displayReducer from "./slices/displaySlice";

export const store = configureStore({
  reducer: {
    peer: peerReducer,
    step: stepReducer,
    display: displayReducer,
  },
});

function syncState<T>(key: string, state: T) {
  if (Array.isArray(state) && state.length === 0) {
    localStorage.removeItem(key);
    return;
  }

  if (state == null) {
    localStorage.removeItem(key);
    return;
  }

  if (typeof state === "object" && !Array.isArray(state) && Object.keys(state).length === 0) {
    localStorage.removeItem(key);
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage write errors (e.g. private mode quota exceeded)
  }
}

// Sync state to localStorage whenever the store changes
store.subscribe(() => {
  const { peer, step, display } = store.getState();
  syncState(PEER_STORAGE_KEY, peer);
  syncState(STEP_STORAGE_KEY, step);
  syncState(DISPLAY_STORAGE_KEY, display);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
