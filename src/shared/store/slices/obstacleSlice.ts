import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ObstacleEntity } from "@/shared/types/model/entities";
import type { UUID } from "@/shared/types/common/uuid";
import { OBSTACLE_STORAGE_KEY } from "@/shared/store/constants";
import { loadStates } from "@/shared/store/utils/storeUtils";

const initialState: ObstacleEntity[] = loadStates<ObstacleEntity>(OBSTACLE_STORAGE_KEY);

const obstacleSlice = createSlice({
  name: "obstacles",
  initialState,
  reducers: {
    setObstacle(state, action: PayloadAction<ObstacleEntity>) {
      const index = state.findIndex((obstacle) => obstacle.id === action.payload.id);
      if (index !== -1) {
        state[index] = action.payload;
      } else {
        state.push(action.payload);
      }
    },
    removeObstacle(state, action: PayloadAction<UUID>) {
      const index = state.findIndex((obstacle) => obstacle.id === action.payload);
      if (index !== -1) {
        state.splice(index, 1);
      }
    },
    replaceObstacles(_state, action: PayloadAction<ObstacleEntity[]>) {
      return action.payload;
    },
    clearObstacles(state) {
      state.length = 0;
    },
  },
});

export const { setObstacle, removeObstacle, replaceObstacles, clearObstacles } =
  obstacleSlice.actions;
export default obstacleSlice.reducer;
