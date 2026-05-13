import { configureStore } from "@reduxjs/toolkit";

import {
  DISPLAY_STORAGE_KEY,
  LINK_STORAGE_KEY,
  OBSTACLE_STORAGE_KEY,
  PEER_STORAGE_KEY,
  STEP_STORAGE_KEY,
} from "./constants";
import peerReducer from "./slices/peerSlice";
import linkReducer from "./slices/linkSlice";
import obstacleReducer from "./slices/obstacleSlice";
import stepReducer from "./slices/stepSlice";
import displayReducer from "./slices/displaySlice";
import { setState } from "./utils/storeUtils";

export const store = configureStore({
  reducer: {
    peer: peerReducer,
    link: linkReducer,
    obstacle: obstacleReducer,
    step: stepReducer,
    display: displayReducer,
  },
});

// Sync state to localStorage whenever the store changes
store.subscribe(() => {
  const { peer, link, obstacle, step, display } = store.getState();

  setState(PEER_STORAGE_KEY, peer);
  setState(LINK_STORAGE_KEY, link);
  setState(OBSTACLE_STORAGE_KEY, obstacle);
  setState(STEP_STORAGE_KEY, step);
  setState(DISPLAY_STORAGE_KEY, display);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
