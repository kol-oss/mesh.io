import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ActionMode, PlacementMode, ToolbarGroup, ToolbarMode } from "../../types/enums";
import type { UUID } from "../../types/uuid";
import { DISPLAY_STORAGE_KEY } from "../constants";
import { loadState } from "../utils/storeUtils";
import type { ToolbarModesByGroup, ToolbarToolMode } from "../../types/action";

export const TABS = {
  ENTITIES: "entities",
  STEPS: "steps",
} as const;

export const DEFAULT_TOOLBAR_MODES_BY_GROUP: ToolbarModesByGroup = {
  [ToolbarGroup.Navigation]: ToolbarMode.NavigationMove,
  [ToolbarGroup.Entities]: PlacementMode.Peer,
  [ToolbarGroup.Steps]: PlacementMode.Message,
  [ToolbarGroup.Inspection]: ToolbarMode.RoutingTable,
  [ToolbarGroup.Text]: PlacementMode.Text,
};

export const DEFAULT_SELECTED_TOOLBAR_GROUP: ToolbarGroup = ToolbarGroup.Navigation;

type SetToolbarModePayload = {
  group: ToolbarGroup;
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

const initialState: DisplayState = loadState<DisplayState>(DISPLAY_STORAGE_KEY, EMPTY_DISPLAY);

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
      const { group, mode } = action.payload;

      switch (group) {
        case ToolbarGroup.Navigation:
          state.toolbarModesByGroup[ToolbarGroup.Navigation] = ToolbarMode.NavigationMove;
          break;
        case ToolbarGroup.Entities:
          state.toolbarModesByGroup[ToolbarGroup.Entities] = mode as
            | ActionMode.Peer
            | ActionMode.Obstacle
            | ActionMode.Link;
          break;
        case ToolbarGroup.Steps:
          state.toolbarModesByGroup[ToolbarGroup.Steps] = mode as
            | ActionMode.Message
            | ActionMode.Move
            | ActionMode.Toggle;
          break;
        case ToolbarGroup.Inspection:
          state.toolbarModesByGroup[ToolbarGroup.Inspection] = mode as
            | ActionMode.RoutingTable
            | ActionMode.PacketStructure;
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
