import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { PlacementMode, ToolbarGroup, ToolbarMode } from "../../types/enums";
import type { UUID } from "../../types/uuid";
import { DISPLAY_STORAGE_KEY } from "../constants";
import { loadState } from "../utils/storeUtils";

export const TABS = {
  ENTITIES: "entities",
  STEPS: "steps",
} as const;

export type ToolbarModesByGroup = {
  [ToolbarGroup.Navigation]: typeof ToolbarMode.NavigationMove;
  [ToolbarGroup.Entities]:
    | typeof PlacementMode.Peer
    | typeof PlacementMode.Link
    | typeof PlacementMode.Obstacle;
  [ToolbarGroup.Steps]:
    | typeof PlacementMode.Message
    | typeof PlacementMode.Move
    | typeof PlacementMode.Toggle;
  [ToolbarGroup.Inspection]: typeof ToolbarMode.RoutingTable | typeof ToolbarMode.PacketStructure;
  [ToolbarGroup.Text]: typeof PlacementMode.Text;
};

export type ToolbarToolMode = ToolbarModesByGroup[keyof ToolbarModesByGroup];

export const DEFAULT_TOOLBAR_MODES_BY_GROUP: ToolbarModesByGroup = {
  [ToolbarGroup.Navigation]: ToolbarMode.NavigationMove,
  [ToolbarGroup.Entities]: PlacementMode.Peer,
  [ToolbarGroup.Steps]: PlacementMode.Message,
  [ToolbarGroup.Inspection]: ToolbarMode.RoutingTable,
  [ToolbarGroup.Text]: PlacementMode.Text,
};

export const DEFAULT_SELECTED_TOOLBAR_GROUP: ToolbarGroup = ToolbarGroup.Navigation;

type SetToolbarModePayload = {
  groupId: ToolbarGroup;
  mode: ToolbarToolMode;
};

type SetOpenedTabPayload = {
  tab: keyof DisplayState["openedTabs"];
  opened: boolean;
};

export interface DisplayState {
  selectedId: UUID | null;
  openedTabs: {
    [TABS.ENTITIES]: boolean;
    [TABS.STEPS]: boolean;
  };
  refreshHidden: boolean;
  selectedToolbarGroup: ToolbarGroup;
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

const normalizeSelectedToolbarGroup = (value: unknown): ToolbarGroup => {
  if (Object.values(ToolbarGroup).includes(value as ToolbarGroup)) {
    return value as ToolbarGroup;
  }

  return DEFAULT_SELECTED_TOOLBAR_GROUP;
};

const normalizeToolbarModesByGroup = (value: unknown): ToolbarModesByGroup => {
  const source = isObject(value) ? value : {};

  const entitiesMode = source[ToolbarGroup.Entities];
  const stepsMode = source[ToolbarGroup.Steps];
  const inspectionMode = source[ToolbarGroup.Inspection];

  return {
    [ToolbarGroup.Navigation]: ToolbarMode.NavigationMove,
    [ToolbarGroup.Entities]:
      entitiesMode === PlacementMode.Link || entitiesMode === PlacementMode.Obstacle
        ? entitiesMode
        : PlacementMode.Peer,
    [ToolbarGroup.Steps]:
      stepsMode === PlacementMode.Move || stepsMode === PlacementMode.Toggle
        ? stepsMode
        : PlacementMode.Message,
    [ToolbarGroup.Inspection]:
      inspectionMode === ToolbarMode.PacketStructure
        ? ToolbarMode.PacketStructure
        : ToolbarMode.RoutingTable,
    [ToolbarGroup.Text]: PlacementMode.Text,
  };
};

const loadInitialDisplayState = (): DisplayState => {
  const persisted = loadState<Partial<DisplayState>>(DISPLAY_STORAGE_KEY, {});

  const openedTabs = {
    ...EMPTY_DISPLAY.openedTabs,
    ...(isObject(persisted.openedTabs) ? persisted.openedTabs : {}),
  };

  return {
    ...EMPTY_DISPLAY,
    ...persisted,
    selectedId: persisted.selectedId ?? EMPTY_DISPLAY.selectedId,
    openedTabs,
    refreshHidden: persisted.refreshHidden ?? EMPTY_DISPLAY.refreshHidden,
    selectedToolbarGroup: normalizeSelectedToolbarGroup(persisted.selectedToolbarGroup),
    toolbarModesByGroup: normalizeToolbarModesByGroup(persisted.toolbarModesByGroup),
  };
};

const initialState: DisplayState = loadInitialDisplayState();

const displaySlice = createSlice({
  name: "display",
  initialState,
  reducers: {
    setSelectedId(state, action: PayloadAction<UUID | null>) {
      state.selectedId = action.payload;
    },
    setOpenedTab(state, action: PayloadAction<SetOpenedTabPayload>) {
      state.openedTabs[action.payload.tab] = action.payload.opened;
    },
    setRefreshHidden(state, action: PayloadAction<boolean>) {
      state.refreshHidden = action.payload;
    },
    setSelectedToolbarGroup(state, action: PayloadAction<ToolbarGroup>) {
      state.selectedToolbarGroup = action.payload;
    },
    setToolbarModeForGroup(state, action: PayloadAction<SetToolbarModePayload>) {
      const { groupId, mode } = action.payload;

      switch (groupId) {
        case ToolbarGroup.Navigation:
          state.toolbarModesByGroup[ToolbarGroup.Navigation] = ToolbarMode.NavigationMove;
          break;
        case ToolbarGroup.Entities:
          if (
            mode === PlacementMode.Peer ||
            mode === PlacementMode.Link ||
            mode === PlacementMode.Obstacle
          ) {
            state.toolbarModesByGroup[ToolbarGroup.Entities] = mode;
          }
          break;
        case ToolbarGroup.Steps:
          if (
            mode === PlacementMode.Message ||
            mode === PlacementMode.Move ||
            mode === PlacementMode.Toggle
          ) {
            state.toolbarModesByGroup[ToolbarGroup.Steps] = mode;
          }
          break;
        case ToolbarGroup.Inspection:
          if (mode === ToolbarMode.RoutingTable || mode === ToolbarMode.PacketStructure) {
            state.toolbarModesByGroup[ToolbarGroup.Inspection] = mode;
          }
          break;
        case ToolbarGroup.Text:
          state.toolbarModesByGroup[ToolbarGroup.Text] = PlacementMode.Text;
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

export const {
  setSelectedId,
  setOpenedTab,
  setRefreshHidden,
  setSelectedToolbarGroup,
  setToolbarModeForGroup,
  clearState,
} = displaySlice.actions;
export default displaySlice.reducer;
