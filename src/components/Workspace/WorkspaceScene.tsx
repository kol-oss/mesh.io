import { Radio } from "lucide-react";

import { ConnectionType, ResizeEdge, SelectionSource } from "../../types/enums";
import type { WorkspaceSceneProps } from "../../types/workspace/scene";
import { shortenLine } from "../../utils/geometry";

export default function WorkspaceScene({
  centerX,
  centerY,
  staticLinks,
  connections,
  rangePolygons,
  moveIndicators,
  messageAnimations,
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
  onMessageAnimationHoverChange,
  onMessageAnimationInspectRequest,
}: WorkspaceSceneProps) {
  return (
    <>
      <svg className="workspace__static-links" aria-hidden="true">
        {staticLinks.map((link) => {
          const rawSourceX = centerX + link.sourceX;
          const rawSourceY = centerY + link.sourceY;
          const rawTargetX = centerX + link.destinationX;
          const rawTargetY = centerY + link.destinationY;
          const { x1, y1, x2, y2 } = shortenLine(
            rawSourceX,
            rawSourceY,
            rawTargetX,
            rawTargetY,
            14,
          );
          const isSelected =
            (selectedSource === SelectionSource.Entities && selectedId === link.id) ||
            resolvedCreationSelectedEntityId === link.id ||
            selectedStepAffectedEntityIds.has(link.id);

          return (
            <g
              key={link.id}
              className={`workspace__static-link ${link.enabled ? "workspace__static-link--enabled" : "workspace__static-link--disabled"}${isSelected ? " workspace__static-link--selected" : ""}`}
            >
              <line
                className="workspace__static-link-hit"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                onPointerDown={(event) => handleStaticLinkPointerDown(link.id, event)}
              />
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
            </g>
          );
        })}
      </svg>
      <svg className="workspace__connections" aria-hidden="true">
        {connections.map((connection) => {
          const rawSourceX = centerX + connection.sourceX;
          const rawSourceY = centerY + connection.sourceY;
          const rawTargetX = centerX + connection.targetX;
          const rawTargetY = centerY + connection.targetY;
          const { x1, y1, x2, y2 } = shortenLine(
            rawSourceX,
            rawSourceY,
            rawTargetX,
            rawTargetY,
            14,
          );
          const isMutual = connection.type === ConnectionType.Mutual;

          return (
            <g
              key={`${connection.type}-${connection.sourceId}-${connection.targetId}`}
              className={`workspace__connection ${
                isMutual ? "workspace__connection--mutual" : "workspace__connection--one-way"
              }`}
            >
              <line x1={x1} y1={y1} x2={x2} y2={y2} />
            </g>
          );
        })}
      </svg>
      <svg className="workspace__ranges" aria-hidden="true">
        {rangePolygons.map((polygon) => (
          <path
            key={polygon.peerId}
            d={polygon.path}
            className={`workspace__peer-range${polygon.selected || hoveredSimulationPeerId === polygon.peerId ? " workspace__peer-range--selected" : ""}${polygon.enabled ? "" : " workspace__peer-range--disabled"}`}
          />
        ))}
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
              <path className="workspace__message-animation-track" d={path} />
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

      {moveIndicators.map((indicator, index) => (
        <span
          key={`target-${indicator.draft ? "draft" : "step"}-${index}`}
          className={`workspace__step-indicator-target${indicator.draft ? " workspace__step-indicator-target--draft" : ""}`}
          style={{
            left: `calc(50% + ${indicator.targetX}px)`,
            top: `calc(50% + ${indicator.targetY}px)`,
          }}
          aria-hidden="true"
        >
          <Radio size={20} />
        </span>
      ))}

      {texts.map((item) => {
        const isEditing = editingTextId === item.id;

        if (isEditing) {
          return (
            <input
              key={item.id}
              className="workspace__text workspace__text--editing"
              style={{
                left: `calc(50% + ${item.x}px)`,
                top: `calc(50% + ${item.y}px)`,
              }}
              value={editingTextDraft}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => setEditingTextDraft(event.target.value)}
              onBlur={commitTextEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTextEdit();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelTextEdit();
                }
              }}
              autoFocus
            />
          );
        }

        return (
          <button
            key={item.id}
            className={`workspace__text${selectedTextId === item.id ? " workspace__text--selected" : ""}${activeDragEntityId === item.id ? " workspace__text--dragging" : ""}`}
            style={{
              left: `calc(50% + ${item.x}px)`,
              top: `calc(50% + ${item.y}px)`,
            }}
            type="button"
            onPointerDown={(event) => handleTextPointerDown(item, event)}
            onPointerMove={handleEntityPointerMove}
            onPointerUp={handleEntityPointerEnd}
            onPointerCancel={handleEntityPointerEnd}
            onDoubleClick={() => handleTextDoubleClick(item)}
            aria-label={`Text ${item.text}`}
          >
            {item.text}
          </button>
        );
      })}

      {obstacles.map((obstacle) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === obstacle.id) ||
          resolvedCreationSelectedEntityId === obstacle.id ||
          selectedStepAffectedEntityIds.has(obstacle.id);
        return (
          <button
            key={obstacle.id}
            className={`workspace__obstacle${isSelected ? " workspace__obstacle--selected" : ""}${activeDragEntityId === obstacle.id ? " workspace__obstacle--dragging" : ""}`}
            style={{
              left: `calc(50% + ${obstacle.x}px)`,
              top: `calc(50% + ${obstacle.y}px)`,
              width: `${Math.max(1, obstacle.width)}px`,
              height: `${Math.max(1, obstacle.height)}px`,
            }}
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              handleObstaclePointerDown(obstacle, event);
            }}
            onPointerMove={handleEntityPointerMove}
            onPointerUp={handleEntityPointerEnd}
            onPointerCancel={handleEntityPointerEnd}
            aria-label={`Obstacle ${obstacle.name}`}
          >
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--left"
              onPointerDown={(event) => handleObstacleResizeStart(obstacle, ResizeEdge.Left, event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--right"
              onPointerDown={(event) =>
                handleObstacleResizeStart(obstacle, ResizeEdge.Right, event)
              }
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--top"
              onPointerDown={(event) => handleObstacleResizeStart(obstacle, ResizeEdge.Top, event)}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
            <span
              className="workspace__obstacle-handle workspace__obstacle-handle--bottom"
              onPointerDown={(event) =>
                handleObstacleResizeStart(obstacle, ResizeEdge.Bottom, event)
              }
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-hidden="true"
            />
          </button>
        );
      })}

      {peers.map((peer) => {
        const isSelected =
          (selectedSource === SelectionSource.Entities && selectedId === peer.id) ||
          hoveredSimulationPeerId === peer.id ||
          resolvedCreationSelectedEntityId === peer.id ||
          selectedStepAffectedEntityIds.has(peer.id);
        return (
          <div key={peer.id}>
            <button
              className={`workspace__peer${isSelected ? " workspace__peer--selected" : ""}${activeDragEntityId === peer.id ? " workspace__peer--dragging" : ""}${peer.enabled ? "" : " workspace__peer--disabled"}`}
              style={{
                left: `calc(50% + ${peer.x}px)`,
                top: `calc(50% + ${peer.y}px)`,
              }}
              type="button"
              onPointerDown={(event) => {
                event.stopPropagation();
                handlePeerPointerDown(peer, event);
              }}
              onPointerMove={handleEntityPointerMove}
              onPointerUp={handleEntityPointerEnd}
              onPointerCancel={handleEntityPointerEnd}
              aria-label={`Peer ${peer.name}`}
            >
              <span className="workspace__peer-icon">
                <Radio size={20} />
              </span>
              <span className="workspace__peer-name">{peer.name}</span>
            </button>
          </div>
        );
      })}
    </>
  );
}
