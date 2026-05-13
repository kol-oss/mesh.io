import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type { WorkspaceSceneProps } from "@/shared/types/workspace/scene";
import WorkspacePeerEntity from "@/features/board/components/WorkspacePeerEntity/WorkspacePeerEntity";

type Props = Pick<
  WorkspaceSceneProps,
  | "peers"
  | "selectedSource"
  | "selectedId"
  | "hoveredSimulationPeerId"
  | "resolvedCreationSelectedEntityId"
  | "selectedStepAffectedEntityIds"
  | "activeDragEntityId"
  | "moveStepAnimation"
  | "toggleStepAnimation"
  | "onPeerHoverChange"
  | "handlePeerPointerDown"
  | "handleEntityPointerMove"
  | "handleEntityPointerEnd"
>;

export default function WorkspacePeers({
  peers,
  selectedSource,
  selectedId,
  hoveredSimulationPeerId,
  resolvedCreationSelectedEntityId,
  selectedStepAffectedEntityIds,
  activeDragEntityId,
  moveStepAnimation,
  toggleStepAnimation,
  onPeerHoverChange,
  handlePeerPointerDown,
  handleEntityPointerMove,
  handleEntityPointerEnd,
}: Props) {
  return (
    <>
      {peers.map((peer) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === peer.id) ||
          hoveredSimulationPeerId === peer.id ||
          resolvedCreationSelectedEntityId === peer.id ||
          selectedStepAffectedEntityIds.has(peer.id);

        return (
          <WorkspacePeerEntity
            key={peer.id}
            peer={peer}
            isSelected={isSelected}
            isDragging={activeDragEntityId === peer.id}
            isMoving={moveStepAnimation?.peerId === peer.id}
            isStatusTransitioning={
              toggleStepAnimation?.entityType === "PEER" && toggleStepAnimation.entityId === peer.id
            }
            onPeerHoverChange={onPeerHoverChange}
            onPointerDown={handlePeerPointerDown}
            onPointerMove={handleEntityPointerMove}
            onPointerEnd={handleEntityPointerEnd}
          />
        );
      })}
    </>
  );
}
