import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { storageKeys } from "../../constants/storage";
import { PlacementMode, ToolbarGroupId, ToolbarMode } from "../../types/enums";
import type { UUID } from "../../types/uuid";
import { DISPLAY_STORAGE_KEY } from "../constants";
import { loadState } from "../utils/storeUtils";

export const TABS = {
  ENTITIES: "entities",
  STEPS: "steps",
} as const;

export type ToolbarModesByGroup = {
  [ToolbarGroupId.Navigation]: typeof ToolbarMode.NavigationMove;
  [ToolbarGroupId.Entities]:
    | typeof PlacementMode.Peer
    | typeof PlacementMode.Link
    | typeof PlacementMode.Obstacle;
  [ToolbarGroupId.Steps]:
    | typeof PlacementMode.Message
    | typeof PlacementMode.Move
    | typeof PlacementMode.Toggle;
  [ToolbarGroupId.Inspection]: typeof ToolbarMode.RoutingTable | typeof ToolbarMode.PacketStructure;
  [ToolbarGroupId.Text]: typeof PlacementMode.Text;
};

export type ToolbarToolMode = ToolbarModesByGroup[keyof ToolbarModesByGroup];

export const DEFAULT_TOOLBAR_MODES_BY_GROUP: ToolbarModesByGroup = {
  [ToolbarGroupId.Navigation]: ToolbarMode.NavigationMove,
  [ToolbarGroupId.Entities]: PlacementMode.Peer,
  [ToolbarGroupId.Steps]: PlacementMode.Message,
  [ToolbarGroupId.Inspection]: ToolbarMode.RoutingTable,
  [ToolbarGroupId.Text]: PlacementMode.Text,
};

export const DEFAULT_SELECTED_TOOLBAR_GROUP: ToolbarGroupId = ToolbarGroupId.Navigation;

type ToolbarModeUpdatePayload = {
  groupId: ToolbarGroupId;
  mode: ToolbarToolMode;
};

export interface DisplayState {
  selectedId: UUID | null;
  openedTabs: {
    [TABS.ENTITIES]: boolean;
    [TABS.STEPS]: boolean;
  };
  refreshHidden: boolean;
  selectedToolbarGroup: ToolbarGroupId;
  toolbarModesByGroup: ToolbarModesByGroup;
}

const EMPTY_DISPLAY: DisplayState = {
  selectedId: null,
  openedTabs: {
    [TABS.ENTITIES]: false,
    [TABS.STEPS]: false,
  },
  refreshHidden: false,
  selectedToolbarGroup: DEFAULT_SELECTED_TOOLBAR_GROUP,
  toolbarModesByGroup: { ...DEFAULT_TOOLBAR_MODES_BY_GROUP },
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizeSelectedToolbarGroup = (value: unknown): ToolbarGroupId => {
  if (Object.values(ToolbarGroupId).includes(value as ToolbarGroupId)) {
    return value as ToolbarGroupId;
  }

  return DEFAULT_SELECTED_TOOLBAR_GROUP;
};

const normalizeToolbarModesByGroup = (value: unknown): ToolbarModesByGroup => {
  const source = isObject(value) ? value : {};

  const entitiesMode = source[ToolbarGroupId.Entities];
  const stepsMode = source[ToolbarGroupId.Steps];
  const inspectionMode = source[ToolbarGroupId.Inspection];

  return {
    [ToolbarGroupId.Navigation]: ToolbarMode.NavigationMove,
    [ToolbarGroupId.Entities]:
      entitiesMode === PlacementMode.Link || entitiesMode === PlacementMode.Obstacle
        ? entitiesMode
        : PlacementMode.Peer,
    [ToolbarGroupId.Steps]:
      stepsMode === PlacementMode.Move || stepsMode === PlacementMode.Toggle
        ? stepsMode
        : PlacementMode.Message,
    [ToolbarGroupId.Inspection]:
      inspectionMode === ToolbarMode.PacketStructure
        ? ToolbarMode.PacketStructure
        : ToolbarMode.RoutingTable,
    [ToolbarGroupId.Text]: PlacementMode.Text,
  };
};

const loadInitialDisplayState = (): DisplayState => {
  const persisted = loadState<Partial<DisplayState>>(DISPLAY_STORAGE_KEY, {});

  const legacySelectedToolbarGroup = loadState<unknown>(
    storageKeys.toolbarSelectedGroup,
    DEFAULT_SELECTED_TOOLBAR_GROUP,
  );

  const legacyToolbarModesByGroup = loadState<unknown>(
    storageKeys.toolbarModesByGroup,
    DEFAULT_TOOLBAR_MODES_BY_GROUP,
  );

  const openedTabs = {
    ...EMPTY_DISPLAY.openedTabs,
    ...(isObject(persisted.openedTabs) ? persisted.openedTabs : {}),
  };

  try {
    localStorage.removeItem(storageKeys.toolbarSelectedGroup);
    localStorage.removeItem(storageKeys.toolbarModesByGroup);
  } catch {
    // Ignore storage write errors (e.g. private mode quota exceeded)
  }

  return {
    ...EMPTY_DISPLAY,
    ...persisted,
    selectedId: persisted.selectedId ?? EMPTY_DISPLAY.selectedId,
    openedTabs,
    refreshHidden: persisted.refreshHidden ?? EMPTY_DISPLAY.refreshHidden,
    selectedToolbarGroup: normalizeSelectedToolbarGroup(
      persisted.selectedToolbarGroup ?? legacySelectedToolbarGroup,
    ),
    toolbarModesByGroup: normalizeToolbarModesByGroup(
      persisted.toolbarModesByGroup ?? legacyToolbarModesByGroup,
    ),
  };
};

const initialState: DisplayState = loadInitialDisplayState();

const displaySlice = createSlice({
  name: "display",
  initialState,
  reducers: {
    setState(state, action: PayloadAction<DisplayState>) {
      state.selectedId = action.payload.selectedId;
      state.openedTabs = action.payload.openedTabs;
      state.refreshHidden = action.payload.refreshHidden;
      state.selectedToolbarGroup = action.payload.selectedToolbarGroup;
      state.toolbarModesByGroup = action.payload.toolbarModesByGroup;
    },
    setSelectedToolbarGroup(state, action: PayloadAction<ToolbarGroupId>) {
      state.selectedToolbarGroup = action.payload;
    },
    setToolbarModeForGroup(state, action: PayloadAction<ToolbarModeUpdatePayload>) {
      const { groupId, mode } = action.payload;

      switch (groupId) {
        case ToolbarGroupId.Navigation:
          state.toolbarModesByGroup[ToolbarGroupId.Navigation] = ToolbarMode.NavigationMove;
          break;
        case ToolbarGroupId.Entities:
          if (
            mode === PlacementMode.Peer ||
            mode === PlacementMode.Link ||
            mode === PlacementMode.Obstacle
          ) {
            state.toolbarModesByGroup[ToolbarGroupId.Entities] = mode;
          }
          break;
        case ToolbarGroupId.Steps:
          if (
            mode === PlacementMode.Message ||
            mode === PlacementMode.Move ||
            mode === PlacementMode.Toggle
          ) {
            state.toolbarModesByGroup[ToolbarGroupId.Steps] = mode;
          }
          break;
        case ToolbarGroupId.Inspection:
          if (mode === ToolbarMode.RoutingTable || mode === ToolbarMode.PacketStructure) {
            state.toolbarModesByGroup[ToolbarGroupId.Inspection] = mode;
          }
          break;
        case ToolbarGroupId.Text:
          state.toolbarModesByGroup[ToolbarGroupId.Text] = PlacementMode.Text;
          break;
      }
    },
    clearState(state) {
      state.selectedId = EMPTY_DISPLAY.selectedId;
      state.openedTabs = { ...EMPTY_DISPLAY.openedTabs };
      state.refreshHidden = EMPTY_DISPLAY.refreshHidden;
      state.selectedToolbarGroup = EMPTY_DISPLAY.selectedToolbarGroup;
      state.toolbarModesByGroup = { ...EMPTY_DISPLAY.toolbarModesByGroup };
    },
  },
});

export const { setState, setSelectedToolbarGroup, setToolbarModeForGroup, clearState } =
  displaySlice.actions;
export default displaySlice.reducer;
