import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { ActionMode } from "@/shared/types/action";
import type { UUID } from "@/shared/types/common/uuid";
import type { SimulationResult } from "@/shared/types/processor/simulation";

export type SimulationInspectionMode = ActionMode.PacketStructure | ActionMode.RoutingTable;

export type PacketInspectorWindow = {
  eventId: UUID;
  isOpen: boolean;
  pinned: boolean;
};

export type TableInspectionWindow = {
  peerId: UUID;
  pinned: boolean;
  isOpen: boolean;
  stepId: UUID | null;
};

export type MessageHoverState = {
  eventId: UUID | null;
  isHovered: boolean;
};

export type SimulationPeerHoverState = {
  eventId: UUID;
  peerId: UUID | null;
} | null;

export interface SimulationState {
  result: SimulationResult | null;
  currentStepIndex: number;
  currentEventIndex: number;
  isRunning: boolean;
  inspectionMode: SimulationInspectionMode;
  packetInspectorWindows: PacketInspectorWindow[];
  tableInspectionWindows: TableInspectionWindow[];
  simulationMessageHoverState: MessageHoverState;
  simulationTqDisclosureByEvent: Record<string, boolean>;
  simulationSequenceDisclosureByEvent: Record<string, boolean>;
  hoveredSimulationPeerState: SimulationPeerHoverState;
}

const initialState: SimulationState = {
  result: null,
  currentStepIndex: 0,
  currentEventIndex: 0,
  isRunning: false,
  inspectionMode: ActionMode.PacketStructure,
  packetInspectorWindows: [],
  tableInspectionWindows: [],
  simulationMessageHoverState: { eventId: null, isHovered: false },
  simulationTqDisclosureByEvent: {},
  simulationSequenceDisclosureByEvent: {},
  hoveredSimulationPeerState: null,
};

const resetWindowState = (state: SimulationState) => {
  state.packetInspectorWindows = [];
  state.tableInspectionWindows = [];
  state.simulationMessageHoverState = { eventId: null, isHovered: false };
  state.simulationTqDisclosureByEvent = {};
  state.simulationSequenceDisclosureByEvent = {};
  state.hoveredSimulationPeerState = null;
};

const simulationSlice = createSlice({
  name: "simulation",
  initialState,
  reducers: {
    simulationCompleted(state, action: PayloadAction<SimulationResult>) {
      state.result = action.payload;
      state.currentStepIndex = 0;
      state.currentEventIndex = 0;
      state.isRunning = false;
      resetWindowState(state);
    },
    clearSimulation(state) {
      state.result = null;
      state.currentStepIndex = 0;
      state.currentEventIndex = 0;
      state.isRunning = false;
      resetWindowState(state);
    },
    setIsRunning(state, action: PayloadAction<boolean>) {
      state.isRunning = action.payload;
    },
    setCurrentStepIndex(state, action: PayloadAction<number>) {
      state.currentStepIndex = action.payload;
      state.currentEventIndex = 0;
    },
    setCurrentEventIndex(state, action: PayloadAction<number>) {
      state.currentEventIndex = action.payload;
    },
    setInspectionMode(state, action: PayloadAction<SimulationInspectionMode>) {
      state.inspectionMode = action.payload;
    },
    setMessageAnimationHover(
      state,
      action: PayloadAction<{ isHovered: boolean; currentSimulationEventId: UUID | null }>,
    ) {
      const { isHovered, currentSimulationEventId } = action.payload;
      state.simulationMessageHoverState.eventId = currentSimulationEventId;
      state.simulationMessageHoverState.isHovered = isHovered;

      if (state.inspectionMode !== ActionMode.PacketStructure || !currentSimulationEventId) return;

      const idx = state.packetInspectorWindows.findIndex(
        (w) => w.eventId === currentSimulationEventId,
      );
      if (idx !== -1) {
        if (state.packetInspectorWindows[idx].pinned) return;
        if (isHovered) {
          state.packetInspectorWindows[idx].isOpen = true;
        } else {
          state.packetInspectorWindows.splice(idx, 1);
        }
      } else if (isHovered) {
        state.packetInspectorWindows.push({
          eventId: currentSimulationEventId,
          isOpen: true,
          pinned: false,
        });
      }
    },

    openPacketInspectorPinned(state, action: PayloadAction<UUID>) {
      if (state.inspectionMode !== ActionMode.PacketStructure) return;
      const eventId = action.payload;
      const idx = state.packetInspectorWindows.findIndex((w) => w.eventId === eventId);
      if (idx !== -1) {
        state.packetInspectorWindows[idx].isOpen = true;
        state.packetInspectorWindows[idx].pinned = true;
      } else {
        state.packetInspectorWindows.push({ eventId, isOpen: true, pinned: true });
      }
    },

    closePacketInspectorWindow(state, action: PayloadAction<UUID>) {
      state.packetInspectorWindows = state.packetInspectorWindows.filter(
        (w) => w.eventId !== action.payload,
      );
    },

    toggleTqDisclosure(state, action: PayloadAction<UUID>) {
      const eventId = action.payload;
      state.simulationTqDisclosureByEvent[eventId] = !(
        state.simulationTqDisclosureByEvent[eventId] ?? false
      );
    },

    toggleSequenceDisclosure(state, action: PayloadAction<UUID>) {
      const eventId = action.payload;
      state.simulationSequenceDisclosureByEvent[eventId] = !(
        state.simulationSequenceDisclosureByEvent[eventId] ?? false
      );
    },

    setHoveredSimulationPeer(
      state,
      action: PayloadAction<{ eventId: UUID; peerId: UUID | null } | null>,
    ) {
      state.hoveredSimulationPeerState = action.payload;
    },

    tableInspectionPeerHoverChange(state, action: PayloadAction<UUID | null>) {
      if (state.inspectionMode !== ActionMode.RoutingTable) return;
      const peerId = action.payload;
      const currentStepId = state.result?.stepResults[state.currentStepIndex]?.step.id ?? null;

      if (peerId === null) {
        state.tableInspectionWindows = state.tableInspectionWindows.filter((w) => w.pinned);
        return;
      }

      const idx = state.tableInspectionWindows.findIndex((w) => w.peerId === peerId);
      if (idx !== -1) {
        if (state.tableInspectionWindows[idx].pinned) return;
        state.tableInspectionWindows[idx].isOpen = true;
        state.tableInspectionWindows[idx].stepId = currentStepId;
      } else {
        state.tableInspectionWindows.push({
          peerId,
          pinned: false,
          isOpen: true,
          stepId: currentStepId,
        });
      }
    },

    closeTableInspectionWindow(state, action: PayloadAction<UUID>) {
      state.tableInspectionWindows = state.tableInspectionWindows.filter(
        (w) => w.peerId !== action.payload,
      );
    },

    pinTableInspectionWindow(state, action: PayloadAction<UUID>) {
      const peerId = action.payload;
      const currentStepId = state.result?.stepResults[state.currentStepIndex]?.step.id ?? null;
      const idx = state.tableInspectionWindows.findIndex((w) => w.peerId === peerId);
      if (idx !== -1) {
        state.tableInspectionWindows[idx].pinned = true;
        state.tableInspectionWindows[idx].isOpen = true;
        state.tableInspectionWindows[idx].stepId = currentStepId;
      } else {
        state.tableInspectionWindows.push({
          peerId,
          pinned: true,
          isOpen: true,
          stepId: currentStepId,
        });
      }
    },
  },
});

export const {
  simulationCompleted,
  clearSimulation,
  setIsRunning,
  setCurrentStepIndex,
  setCurrentEventIndex,
  setInspectionMode,
  setMessageAnimationHover,
  openPacketInspectorPinned,
  closePacketInspectorWindow,
  toggleTqDisclosure,
  toggleSequenceDisclosure,
  setHoveredSimulationPeer,
  tableInspectionPeerHoverChange,
  closeTableInspectionWindow,
  pinTableInspectionWindow,
} = simulationSlice.actions;

export default simulationSlice.reducer;
