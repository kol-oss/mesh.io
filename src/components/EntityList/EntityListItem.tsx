import { type PointerEvent as ReactPointerEvent } from "react";
import { Link, Lock, LockOpen, Radio, SquareSlash } from "lucide-react";
import type { NetworkEntity } from "../../types/navigation";
import TooltipAnchor from "../Tooltip/TooltipAnchor";

type EntityListItemProps = {
  entity: NetworkEntity;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export default function EntityListItem({
  entity,
  isSelected,
  isDragging,
  onSelect,
  onToggleLock,
  onPointerDown,
}: EntityListItemProps) {
  const entityTypeTooltip = {
    PEER: "Peer",
    LINK: "Link",
    OBSTACLE: "Obstacle",
  }[entity.type];

  const entityTypeIcon = {
    PEER: <Radio size={13} />,
    LINK: <Link size={13} />,
    OBSTACLE: <SquareSlash size={13} />,
  }[entity.type];

  return (
    <div
      className={`navigation__entity-item${isSelected ? " navigation__entity-item--selected" : ""}${isDragging ? " navigation__entity-item--dragging" : ""}`}
      onClick={onSelect}
      onPointerDown={onPointerDown}
    >
      <TooltipAnchor content={entityTypeTooltip}>
        <span className="navigation__entity-type">{entityTypeIcon}</span>
      </TooltipAnchor>
      <span className="navigation__entity-title">{entity.name}</span>
      <TooltipAnchor content={entity.locked ? "Unlock" : "Lock"}>
        <button
          className={`navigation__entity-lock ${entity.locked ? "navigation__entity-lock--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          type="button"
          aria-label={entity.locked ? "Unlock" : "Lock"}
        >
          {entity.locked ? <Lock size={11} /> : <LockOpen size={11} />}
        </button>
      </TooltipAnchor>
    </div>
  );
}
