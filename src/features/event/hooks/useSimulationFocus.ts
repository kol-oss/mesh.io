import { useMemo } from "react";

import type {
  SimulationPeerHoverState,
  TableInspectionWindow,
} from "@/shared/store/slices/simulationSlice";
import { ActionMode as ToolbarMode } from "@/shared/types/action";
import { EventType, type Event, type StatusChangeEventDetails } from "@/shared/types/common/events";
import type { StepResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import { clamp } from "@/shared/utils/math/clamp";

type Params = {
  tableInspectionWindows: TableInspectionWindow[];
  currentStepId: UUID | null;
  currentSimulationEvent: Event | null;
  currentSimulationStepResult: StepResult | null;
  entities: NetworkEntity[];
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
  entities,
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
    const simulationEntities = currentSimulationStepResult?.snapshot.entities ?? entities;
    const simulationPeers = currentSimulationStepResult?.snapshot.peers ?? peers;
    const peerById = new Map(simulationPeers.map((peer) => [peer.id, peer]));

    const getLinkAnchorPosition = (linkId: UUID): { x: number; y: number } | null => {
      const link = simulationEntities.find(
        (entity) => entity.type === EntityType.Link && entity.id === linkId,
      );

      if (!link || !link.sourcePeerId || !link.destinationPeerId) {
        return null;
      }

      const sourcePeer =
        peerById.get(link.sourcePeerId) ?? peers.find((peer) => peer.id === link.sourcePeerId);
      const destinationPeer =
        peerById.get(link.destinationPeerId) ??
        peers.find((peer) => peer.id === link.destinationPeerId);

      if (!sourcePeer || !destinationPeer) {
        return null;
      }

      return {
        x: (sourcePeer.x + destinationPeer.x) / 2,
        y: (sourcePeer.y + destinationPeer.y) / 2,
      };
    };

    const getSimulationAnchorModelPosition = (): { x: number; y: number } | null => {
      if (!currentSimulationEvent) {
        return null;
      }

      if (currentSimulationEvent.type === EventType.StatusChange) {
        const details = currentSimulationEvent.details as StatusChangeEventDetails;
        if (details.entityType === EntityType.Link) {
          return getLinkAnchorPosition(details.entityId);
        }
      }

      const anchorPeer = peerById.get(currentSimulationEvent.peerId) ?? null;
      if (!anchorPeer) {
        return null;
      }

      return {
        x: anchorPeer.x,
        y: anchorPeer.y,
      };
    };

    const simulationAnchorModelPosition = getSimulationAnchorModelPosition();

    const simulationAnchorViewportPosition = simulationAnchorModelPosition
      ? {
          x: centerX + simulationAnchorModelPosition.x + panOffset.x,
          y: centerY + simulationAnchorModelPosition.y + panOffset.y,
        }
      : null;

    const isSimulationAnchorVisible = simulationAnchorViewportPosition
      ? simulationAnchorViewportPosition.x >= 0 &&
        simulationAnchorViewportPosition.x <= workspaceSize.width &&
        simulationAnchorViewportPosition.y >= 0 &&
        simulationAnchorViewportPosition.y <= workspaceSize.height
      : false;

    const simulationAnchorPosition =
      simulationAnchorModelPosition && simulationAnchorViewportPosition && isSimulationAnchorVisible
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
        ? (hoveredSimulationPeerId ?? inspectedTablePeerId)
        : hoveredSimulationPeerId;

    return {
      simulationAnchorPosition,
      highlightedSimulationPeerId,
    };
  }, [
    centerX,
    centerY,
    entities,
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
