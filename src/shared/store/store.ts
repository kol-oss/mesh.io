import { configureStore } from "@reduxjs/toolkit";

import {
  DISPLAY_STORAGE_KEY,
  LINK_STORAGE_KEY,
  OBSTACLE_STORAGE_KEY,
  PEER_STORAGE_KEY,
  STEP_STORAGE_KEY,
  TEXT_STORAGE_KEY,
} from "./constants";
import peerReducer from "@/shared/store/slices/peerSlice";
import linkReducer from "@/shared/store/slices/linkSlice";
import obstacleReducer from "@/shared/store/slices/obstacleSlice";
import stepReducer from "@/shared/store/slices/stepSlice";
import textReducer from "@/shared/store/slices/textSlice";
import displayReducer from "@/shared/store/slices/displaySlice";
import { setState } from "@/shared/store/utils/storeUtils";

export const store = configureStore({
  reducer: {
    peer: peerReducer,
    link: linkReducer,
    obstacle: obstacleReducer,
    step: stepReducer,
    text: textReducer,
    display: displayReducer,
  },
});

// Sync state to localStorage whenever the store changes
store.subscribe(() => {
  const { peer, link, obstacle, step, text, display } = store.getState();

  setState(PEER_STORAGE_KEY, peer);
  setState(LINK_STORAGE_KEY, link);
  setState(OBSTACLE_STORAGE_KEY, obstacle);
  setState(STEP_STORAGE_KEY, step);
  setState(TEXT_STORAGE_KEY, text);
  setState(DISPLAY_STORAGE_KEY, display);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
