import { configureStore } from "@reduxjs/toolkit";

import boardReducer from "@/shared/store/slices/boardSlice";
import displayReducer, { replaceDisplay } from "@/shared/store/slices/displaySlice";
import linkReducer, { replaceLinks } from "@/shared/store/slices/linkSlice";
import obstacleReducer, { replaceObstacles } from "@/shared/store/slices/obstacleSlice";
import peerReducer, { replacePeers } from "@/shared/store/slices/peerSlice";
import simulationReducer from "@/shared/store/slices/simulationSlice";
import stepReducer, { replaceSteps } from "@/shared/store/slices/stepSlice";
import textReducer, { replaceTexts } from "@/shared/store/slices/textSlice";
import { loadState, loadStates, setState } from "@/shared/store/utils/storeUtils";
import type { LinkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { Step } from "@/shared/types/model/steps";
import type { TextItem } from "@/shared/types/workspace/text";
import { sanitizePeerEntities } from "@/shared/utils/entities/sanitizers";
import {
  DISPLAY_STORAGE_KEY,
  LINK_STORAGE_KEY,
  OBSTACLE_STORAGE_KEY,
  PEER_STORAGE_KEY,
  STEP_STORAGE_KEY,
  TEXT_STORAGE_KEY,
} from "./constants";

export const store = configureStore({
  reducer: {
    peer: peerReducer,
    link: linkReducer,
    obstacle: obstacleReducer,
    step: stepReducer,
    text: textReducer,
    display: displayReducer,
    board: boardReducer,
    simulation: simulationReducer,
  },
});

// Sync state to localStorage whenever the store changes.
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

// Sync state changes made in other tabs into this tab's Redux store.
window.addEventListener("storage", (event: StorageEvent) => {
  if (!event.key || event.newValue === event.oldValue) return;

  switch (event.key) {
    case PEER_STORAGE_KEY:
      store.dispatch(replacePeers(sanitizePeerEntities(loadStates<PeerEntity>(PEER_STORAGE_KEY))));
      break;
    case LINK_STORAGE_KEY:
      store.dispatch(replaceLinks(loadStates<LinkEntity>(LINK_STORAGE_KEY)));
      break;
    case OBSTACLE_STORAGE_KEY:
      store.dispatch(replaceObstacles(loadStates<ObstacleEntity>(OBSTACLE_STORAGE_KEY)));
      break;
    case STEP_STORAGE_KEY:
      store.dispatch(replaceSteps(loadStates<Step>(STEP_STORAGE_KEY)));
      break;
    case TEXT_STORAGE_KEY:
      store.dispatch(replaceTexts(loadStates<TextItem>(TEXT_STORAGE_KEY)));
      break;
    case DISPLAY_STORAGE_KEY: {
      const display = loadState(DISPLAY_STORAGE_KEY, null);
      if (display) store.dispatch(replaceDisplay(display));
      break;
    }
    default:
      break;
  }
});
