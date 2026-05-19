import { useMemo } from "react";

import type {
  SimulationPeerHoverState,
  TableInspectionWindow,
} from "@/shared/store/slices/simulationSlice";
import { ActionMode as ToolbarMode } from "@/shared/types/action";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { Event, SimulationStepResult } from "@/shared/types/model/simulation";
import { clamp } from "@/shared/utils/math/clamp";

type Params = {
  tableInspectionWindows: TableInspectionWindow[];
  currentStepId: UUID | null;
  currentSimulationEvent: Event | null;
  currentSimulationStepResult: SimulationStepResult | null;
  peers: PeerEntity[];
  simulationInspectionMode: ToolbarMode;
  hoveredSimulationPeerState: SimulationPeerHoverState;
  centerX: number;
  centerY: number;
  panOffset: { x: number; y: number };
  workspaceSize: { width: number; height: number };
};

export function useSimulationFocus({
  tableInspectionWindows,
  currentStepId,
  currentSimulationEvent,
  currentSimulationStepResult,
  peers,
  simulationInspectionMode,
  hoveredSimulationPeerState,
  centerX,
  centerY,
  panOffset,
  workspaceSize,
}: Params) {
  return useMemo(() => {
    const inspectedTablePeerId =
      tableInspectionWindows.find((w) => w.isOpen && (w.pinned || w.stepId === currentStepId))
        ?.peerId ?? null;
    const simulationAnchorPeerId = currentSimulationEvent?.peerId ?? null;

    const simulationAnchorPeer = simulationAnchorPeerId
      ? (currentSimulationStepResult?.snapshot.peers.find(
          (peer) => peer.id === simulationAnchorPeerId,
        ) ??
        peers.find((peer) => peer.id === simulationAnchorPeerId) ??
        null)
      : null;

    const simulationAnchorViewportPosition = simulationAnchorPeer
      ? {
          x: centerX + simulationAnchorPeer.x + panOffset.x,
          y: centerY + simulationAnchorPeer.y + panOffset.y,
        }
      : null;

    const isSimulationAnchorVisible = simulationAnchorViewportPosition
      ? simulationAnchorViewportPosition.x >= 0 &&
        simulationAnchorViewportPosition.x <= workspaceSize.width &&
        simulationAnchorViewportPosition.y >= 0 &&
        simulationAnchorViewportPosition.y <= workspaceSize.height
      : false;

    const simulationAnchorPosition =
      simulationAnchorPeer && simulationAnchorViewportPosition && isSimulationAnchorVisible
        ? {
            x:
              clamp(
                simulationAnchorViewportPosition.x,
                220,
                Math.max(220, workspaceSize.width - 220),
              ) - panOffset.x,
            y:
              clamp(
                simulationAnchorViewportPosition.y,
                168,
                Math.max(168, workspaceSize.height - 40),
              ) - panOffset.y,
          }
        : null;

    const hoveredSimulationPeerId =
      currentSimulationEvent && hoveredSimulationPeerState?.eventId === currentSimulationEvent.id
        ? hoveredSimulationPeerState.peerId
        : null;
    const highlightedSimulationPeerId =
      simulationInspectionMode === ToolbarMode.RoutingTable
        ? inspectedTablePeerId
        : hoveredSimulationPeerId;

    return {
      simulationAnchorPosition,
      highlightedSimulationPeerId,
    };
  }, [
    centerX,
    centerY,
    currentSimulationEvent,
    currentSimulationStepResult,
    currentStepId,
    hoveredSimulationPeerState,
    panOffset.x,
    panOffset.y,
    peers,
    simulationInspectionMode,
    tableInspectionWindows,
    workspaceSize.height,
    workspaceSize.width,
  ]);
}
