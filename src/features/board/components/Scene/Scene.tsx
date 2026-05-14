import { useState } from "react";
import { Radio } from "lucide-react";

import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import type { WorkspaceSceneProps } from "@/shared/types/workspace/scene";
import { shortenLine } from "@/shared/processor/connectivity";
import Connection from "@/features/board/components/Connection/Connection";
import Link from "@/features/board/components/Link/Link";
import Peer from "@/features/board/components/Peer/Peer";
import Obstacle from "@/features/board/components/Obstacle/Obstacle";
import Text from "@/features/board/components/Text/Text";

export default function Scene({
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
  const [hoveredConnection, setHoveredConnection] = useState<{
    key: string;
    x: number;
    y: number;
    distance: number;
  } | null>(null);

  return (
    <>
      {/* Static links */}
      <svg className="workspace__static-links" aria-hidden="true">
        {staticLinks.map((link) => {
          const isSelected =
            (selectedSource === SelectionSource.Entities && selectedId === link.id) ||
            resolvedCreationSelectedEntityId === link.id ||
            selectedStepAffectedEntityIds.has(link.id);

          return (
            <Link
              key={link.id}
              link={link}
              centerX={centerX}
              centerY={centerY}
              isSelected={isSelected}
              isStatusTransitioning={
                toggleStepAnimation?.entityType === "LINK" &&
                toggleStepAnimation.entityId === link.id
              }
              onPointerDown={handleStaticLinkPointerDown}
            />
          );
        })}
      </svg>

      {/* Dynamic connections */}
      <svg className="workspace__connections" aria-hidden="true">
        {connections.map((connection) => {
          const key = `${connection.type}-${connection.sourceId}-${connection.targetId}`;

          return (
            <Connection
              key={key}
              connection={connection}
              centerX={centerX}
              centerY={centerY}
              onPointerEnter={(payload) => setHoveredConnection(payload)}
              onPointerLeave={(leftKey) =>
                setHoveredConnection((prev) => (prev?.key === leftKey ? null : prev))
              }
            />
          );
        })}
      </svg>
      {hoveredConnection ? (
        <span
          className="workspace__connection-tooltip"
          style={{
            left: `${hoveredConnection.x}px`,
            top: `${hoveredConnection.y}px`,
          }}
          aria-hidden="true"
        >
          {`Distance: ${hoveredConnection.distance.toFixed(1)}`}
        </span>
      ) : null}

      {/* Range polygons */}
      <svg className="workspace__ranges" aria-hidden="true">
        {rangePolygons.map((polygon) => (
          <path
            key={polygon.peerId}
            d={polygon.path}
            className={`workspace__peer-range${polygon.selected || hoveredSimulationPeerId === polygon.peerId ? " workspace__peer-range--selected" : ""}${polygon.enabled ? "" : " workspace__peer-range--disabled"}`}
          />
        ))}
      </svg>

      {/* Move step indicator ranges */}
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

      {/* Move step indicator arrows */}
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

      {/* Message animations */}
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

      {/* Move step indicator targets */}
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

      {/* Text items */}
      {texts.map((item) => (
        <Text
          key={item.id}
          item={item}
          isEditing={editingTextId === item.id}
          editingTextDraft={editingTextDraft}
          selectedTextId={selectedTextId}
          activeDragEntityId={activeDragEntityId}
          setEditingTextDraft={setEditingTextDraft}
          commitTextEdit={commitTextEdit}
          cancelTextEdit={cancelTextEdit}
          onPointerDown={handleTextPointerDown}
          onPointerMove={handleEntityPointerMove}
          onPointerEnd={handleEntityPointerEnd}
          onDoubleClick={handleTextDoubleClick}
        />
      ))}

      {/* Obstacles */}
      {obstacles.map((obstacle) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === obstacle.id) ||
          resolvedCreationSelectedEntityId === obstacle.id ||
          selectedStepAffectedEntityIds.has(obstacle.id);

        return (
          <Obstacle
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

      {/* Peers */}
      {peers.map((peer) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === peer.id) ||
          hoveredSimulationPeerId === peer.id ||
          resolvedCreationSelectedEntityId === peer.id ||
          selectedStepAffectedEntityIds.has(peer.id);

        return (
          <Peer
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
