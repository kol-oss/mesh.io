import { SelectionType as SelectionSource } from "../../../../shared/types/view/selection";
import type { WorkspaceSceneProps } from "../../../../shared/types/workspace/scene";
import WorkspaceObstacleEntity from "../WorkspaceObstacleEntity/WorkspaceObstacleEntity";

type Props = Pick<
  WorkspaceSceneProps,
  | "obstacles"
  | "selectedSource"
  | "selectedId"
  | "resolvedCreationSelectedEntityId"
  | "selectedStepAffectedEntityIds"
  | "activeDragEntityId"
  | "handleObstaclePointerDown"
  | "handleEntityPointerMove"
  | "handleEntityPointerEnd"
  | "handleObstacleResizeStart"
>;

export default function WorkspaceObstacles({
  obstacles,
  selectedSource,
  selectedId,
  resolvedCreationSelectedEntityId,
  selectedStepAffectedEntityIds,
  activeDragEntityId,
  handleObstaclePointerDown,
  handleEntityPointerMove,
  handleEntityPointerEnd,
  handleObstacleResizeStart,
}: Props) {
  return (
    <>
      {obstacles.map((obstacle) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === obstacle.id) ||
          resolvedCreationSelectedEntityId === obstacle.id ||
          selectedStepAffectedEntityIds.has(obstacle.id);

        return (
          <WorkspaceObstacleEntity
            key={obstacle.id}
            obstacle={obstacle}
            isSelected={isSelected}
            isDragging={activeDragEntityId === obstacle.id}
            onPointerDown={handleObstaclePointerDown}
            onPointerMove={handleEntityPointerMove}
            onPointerEnd={handleEntityPointerEnd}
            onResizeStart={handleObstacleResizeStart}
          />
        );
      })}
    </>
  );
}
