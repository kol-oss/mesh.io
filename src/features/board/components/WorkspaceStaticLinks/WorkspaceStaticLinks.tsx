import type { WorkspaceSceneProps } from "../../../../shared/types/workspace/scene";
import { SelectionType as SelectionSource } from "../../../../shared/types/view/selection";
import WorkspaceLink from "../WorkspaceLink/WorkspaceLink";

type Props = Pick<
  WorkspaceSceneProps,
  | "centerX"
  | "centerY"
  | "staticLinks"
  | "selectedSource"
  | "selectedId"
  | "resolvedCreationSelectedEntityId"
  | "selectedStepAffectedEntityIds"
  | "toggleStepAnimation"
  | "handleStaticLinkPointerDown"
>;

export default function WorkspaceStaticLinks({
  centerX,
  centerY,
  staticLinks,
  selectedSource,
  selectedId,
  resolvedCreationSelectedEntityId,
  selectedStepAffectedEntityIds,
  toggleStepAnimation,
  handleStaticLinkPointerDown,
}: Props) {
  return (
    <svg className="workspace__static-links" aria-hidden="true">
      {staticLinks.map((link) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === link.id) ||
          resolvedCreationSelectedEntityId === link.id ||
          selectedStepAffectedEntityIds.has(link.id);

        return (
          <WorkspaceLink
            key={link.id}
            link={link}
            centerX={centerX}
            centerY={centerY}
            isSelected={isSelected}
            isStatusTransitioning={
              toggleStepAnimation?.entityType === "LINK" && toggleStepAnimation.entityId === link.id
            }
            onPointerDown={handleStaticLinkPointerDown}
          />
        );
      })}
    </svg>
  );
}
