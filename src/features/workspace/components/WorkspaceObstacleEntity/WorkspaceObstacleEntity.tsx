import { ui } from "../../../../shared/i18n/messages";
import { ResizeEdge } from "../../../../shared/types/enums";
import type { ObstacleEntity } from "../../../../shared/types/navigation";

type Props = {
  obstacle: ObstacleEntity;
  isSelected: boolean;
  isDragging: boolean;
  onPointerDown: (obstacle: ObstacleEntity, event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerEnd: (event: React.PointerEvent<HTMLElement>) => void;
  onResizeStart: (
    obstacle: ObstacleEntity,
    edge: ResizeEdge,
    event: React.PointerEvent<HTMLSpanElement>,
  ) => void;
};

export default function WorkspaceObstacleEntity({
  obstacle,
  isSelected,
  isDragging,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onResizeStart,
}: Props) {
  return (
    <button
      className={`workspace__obstacle${isSelected ? " workspace__obstacle--selected" : ""}${isDragging ? " workspace__obstacle--dragging" : ""}`}
      style={{
        left: `calc(50% + ${obstacle.x}px)`,
        top: `calc(50% + ${obstacle.y}px)`,
        width: `${Math.max(1, obstacle.width)}px`,
        height: `${Math.max(1, obstacle.height)}px`,
      }}
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(obstacle, event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      aria-label={ui.workspace.obstacleLabel(obstacle.name)}
    >
      <span
        className="workspace__obstacle-handle workspace__obstacle-handle--left"
        onPointerDown={(event) => onResizeStart(obstacle, ResizeEdge.Left, event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        aria-hidden="true"
      />
      <span
        className="workspace__obstacle-handle workspace__obstacle-handle--right"
        onPointerDown={(event) => onResizeStart(obstacle, ResizeEdge.Right, event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        aria-hidden="true"
      />
      <span
        className="workspace__obstacle-handle workspace__obstacle-handle--top"
        onPointerDown={(event) => onResizeStart(obstacle, ResizeEdge.Top, event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        aria-hidden="true"
      />
      <span
        className="workspace__obstacle-handle workspace__obstacle-handle--bottom"
        onPointerDown={(event) => onResizeStart(obstacle, ResizeEdge.Bottom, event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        aria-hidden="true"
      />
    </button>
  );
}
