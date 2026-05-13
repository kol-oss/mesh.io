import { Radio } from "lucide-react";

import type { WorkspaceSceneProps } from "@/shared/types/workspace/scene";
import { shortenLine } from "@/shared/utils/geometry";
import WorkspaceConnections from "@/features/board/components/WorkspaceConnections/WorkspaceConnections";
import WorkspaceObstacles from "@/features/board/components/WorkspaceObstacles/WorkspaceObstacles";
import WorkspacePeers from "@/features/board/components/WorkspacePeers/WorkspacePeers";
import WorkspaceRanges from "@/features/board/components/WorkspaceRanges/WorkspaceRanges";
import WorkspaceStaticLinks from "@/features/board/components/WorkspaceStaticLinks/WorkspaceStaticLinks";
import WorkspaceTexts from "@/features/board/components/WorkspaceTexts/WorkspaceTexts";

export default function WorkspaceScene({
  centerX,
  centerY,
  staticLinks,
  connections,
  rangePolygons,
  moveIndicators,
  messageAnimations,
  moveStepAnimation,
  toggleStepAnimation,
  texts,
  obstacles,
  peers,
  selectedSource,
  selectedId,
  hoveredSimulationPeerId,
  resolvedCreationSelectedEntityId,
  selectedStepAffectedEntityIds,
  editingTextId,
  editingTextDraft,
  selectedTextId,
  activeDragEntityId,
  setEditingTextDraft,
  commitTextEdit,
  cancelTextEdit,
  handleStaticLinkPointerDown,
  handleTextPointerDown,
  handleTextDoubleClick,
  handleEntityPointerMove,
  handleEntityPointerEnd,
  handleObstaclePointerDown,
  handleObstacleResizeStart,
  handlePeerPointerDown,
  handleMoveIndicatorPointerDown,
  handleMoveIndicatorPointerMove,
  handleMoveIndicatorPointerEnd,
  onPeerHoverChange,
  onMessageAnimationHoverChange,
  onMessageAnimationInspectRequest,
}: WorkspaceSceneProps) {
  return (
    <>
      <WorkspaceStaticLinks
        centerX={centerX}
        centerY={centerY}
        staticLinks={staticLinks}
        selectedSource={selectedSource}
        selectedId={selectedId}
        resolvedCreationSelectedEntityId={resolvedCreationSelectedEntityId}
        selectedStepAffectedEntityIds={selectedStepAffectedEntityIds}
        toggleStepAnimation={toggleStepAnimation}
        handleStaticLinkPointerDown={handleStaticLinkPointerDown}
      />

      <WorkspaceConnections centerX={centerX} centerY={centerY} connections={connections} />

      <WorkspaceRanges
        rangePolygons={rangePolygons}
        hoveredSimulationPeerId={hoveredSimulationPeerId}
      />

      <svg className="workspace__step-indicator-ranges" aria-hidden="true">
        {moveIndicators.map((indicator) => {
          if (indicator.targetRange <= 0) {
            return null;
          }

          return (
            <circle
              key={`range-${indicator.draft ? "draft" : (indicator.stepId ?? "step")}`}
              className={`workspace__step-indicator-range${indicator.draft ? " workspace__step-indicator-range--draft" : ""}`}
              cx={centerX + indicator.targetX}
              cy={centerY + indicator.targetY}
              r={indicator.targetRange}
            />
          );
        })}
      </svg>

      <svg className="workspace__step-indicators" aria-hidden="true">
        {moveIndicators.map((indicator, index) => {
          const sourceX = centerX + indicator.sourceX;
          const sourceY = centerY + indicator.sourceY;
          const targetX = centerX + indicator.targetX;
          const targetY = centerY + indicator.targetY;
          const { x1, y1, x2, y2 } = shortenLine(sourceX, sourceY, targetX, targetY, 14);

          return (
            <g
              key={`${indicator.draft ? "draft" : "step"}-${index}`}
              className={`workspace__step-indicator${indicator.draft ? " workspace__step-indicator--draft" : ""}`}
            >
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
            </g>
          );
        })}
      </svg>

      {messageAnimations.length > 0 ? (
        <svg className="workspace__message-animations" aria-hidden="true">
          {messageAnimations.map((animation) => {
            const rawSourceX = centerX + animation.sourceX;
            const rawSourceY = centerY + animation.sourceY;
            const rawTargetX = centerX + animation.targetX;
            const rawTargetY = centerY + animation.targetY;
            const { x1, y1, x2, y2 } = shortenLine(
              rawSourceX,
              rawSourceY,
              rawTargetX,
              rawTargetY,
              18,
            );
            const path = `M ${x1} ${y1} L ${x2} ${y2}`;

            return (
              <g
                key={animation.key}
                className={`workspace__message-animation workspace__message-animation--${animation.variant}`}
              >
                <path
                  className="workspace__message-animation-hit"
                  d={path}
                  onPointerEnter={() => onMessageAnimationHoverChange(true)}
                  onPointerLeave={() => onMessageAnimationHoverChange(false)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onMessageAnimationInspectRequest();
                  }}
                />
                <g className="workspace__message-envelope">
                  <animateMotion dur="1.35s" repeatCount="indefinite" path={path} />
                  <rect x="-9" y="-6" width="18" height="12" rx="2.5" />
                  <path d="M -9 -5 L 0 1.25 L 9 -5" />
                </g>
                {animation.variant === "route-change" ? (
                  <circle className="workspace__message-target-pulse" cx={x2} cy={y2} r="7" />
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}

      {moveIndicators.map((indicator, index) => (
        <span
          key={`target-${indicator.draft ? "draft" : (indicator.stepId ?? "step")}-${index}`}
          className={`workspace__step-indicator-target${indicator.draft ? " workspace__step-indicator-target--draft" : ""}${!indicator.draft && indicator.stepId ? " workspace__step-indicator-target--interactive" : ""}`}
          style={{
            left: `calc(50% + ${indicator.targetX}px)`,
            top: `calc(50% + ${indicator.targetY}px)`,
          }}
          onPointerDown={
            !indicator.draft && indicator.stepId
              ? (event) => handleMoveIndicatorPointerDown(indicator.stepId!, event)
              : undefined
          }
          onPointerMove={!indicator.draft ? handleMoveIndicatorPointerMove : undefined}
          onPointerUp={!indicator.draft ? handleMoveIndicatorPointerEnd : undefined}
          onPointerCancel={!indicator.draft ? handleMoveIndicatorPointerEnd : undefined}
          aria-hidden="true"
        >
          <Radio size={20} />
        </span>
      ))}

      <WorkspaceTexts
        texts={texts}
        editingTextId={editingTextId}
        editingTextDraft={editingTextDraft}
        selectedTextId={selectedTextId}
        activeDragEntityId={activeDragEntityId}
        setEditingTextDraft={setEditingTextDraft}
        commitTextEdit={commitTextEdit}
        cancelTextEdit={cancelTextEdit}
        handleTextPointerDown={handleTextPointerDown}
        handleEntityPointerMove={handleEntityPointerMove}
        handleEntityPointerEnd={handleEntityPointerEnd}
        handleTextDoubleClick={handleTextDoubleClick}
      />

      <WorkspaceObstacles
        obstacles={obstacles}
        selectedSource={selectedSource}
        selectedId={selectedId}
        resolvedCreationSelectedEntityId={resolvedCreationSelectedEntityId}
        selectedStepAffectedEntityIds={selectedStepAffectedEntityIds}
        activeDragEntityId={activeDragEntityId}
        handleObstaclePointerDown={handleObstaclePointerDown}
        handleEntityPointerMove={handleEntityPointerMove}
        handleEntityPointerEnd={handleEntityPointerEnd}
        handleObstacleResizeStart={handleObstacleResizeStart}
      />

      <WorkspacePeers
        peers={peers}
        selectedSource={selectedSource}
        selectedId={selectedId}
        hoveredSimulationPeerId={hoveredSimulationPeerId}
        resolvedCreationSelectedEntityId={resolvedCreationSelectedEntityId}
        selectedStepAffectedEntityIds={selectedStepAffectedEntityIds}
        activeDragEntityId={activeDragEntityId}
        moveStepAnimation={moveStepAnimation}
        toggleStepAnimation={toggleStepAnimation}
        onPeerHoverChange={onPeerHoverChange}
        handlePeerPointerDown={handlePeerPointerDown}
        handleEntityPointerMove={handleEntityPointerMove}
        handleEntityPointerEnd={handleEntityPointerEnd}
      />
    </>
  );
}
