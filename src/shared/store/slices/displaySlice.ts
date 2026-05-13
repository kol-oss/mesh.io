import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ActionMode, ActionGroup as ToolbarGroup } from "../../types/action";
import type { UUID } from "../../types/common/uuid";
import { DISPLAY_STORAGE_KEY } from "../constants";
import { loadState } from "../utils/storeUtils";
import type { ActionModesByGroup, ActionToolMode } from "../../types/action";

export const TABS = {
  ENTITIES: "entities",
  STEPS: "steps",
} as const;

export const DEFAULT_TOOLBAR_MODES_BY_GROUP: ActionModesByGroup = {
  [ToolbarGroup.Navigation]: ActionMode.NavigationMove,
  [ToolbarGroup.Entities]: ActionMode.Peer,
  [ToolbarGroup.Steps]: ActionMode.Message,
  [ToolbarGroup.Inspection]: ActionMode.RoutingTable,
  [ToolbarGroup.Text]: ActionMode.Text,
};

export const DEFAULT_SELECTED_TOOLBAR_GROUP: ToolbarGroup = ToolbarGroup.Navigation;

type SetToolbarModePayload = {
  group: ToolbarGroup;
  mode: ActionToolMode;
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
  toolbarModesByGroup: ActionModesByGroup;
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
          state.toolbarModesByGroup[ToolbarGroup.Navigation] = ActionMode.NavigationMove;
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
          state.toolbarModesByGroup[ToolbarGroup.Text] = ActionMode.Text;
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
