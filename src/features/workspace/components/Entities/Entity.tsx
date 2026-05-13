import { type PointerEvent as ReactPointerEvent } from "react";
import { Link, Lock, LockOpen, Radio, SquareSlash } from "lucide-react";
import { EntityType } from "../../../../shared/types/model/entities";
import type { NetworkEntity } from "../../../../shared/types/model/entities";
import Tooltip from "../../../../shared/ui/components/Tooltip/Tooltip";

type EntityProps = {
  entity: NetworkEntity;
  isSelected: boolean;
  isDragging?: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export default function Entity({
  entity,
  isSelected,
  isDragging,
  onSelect,
  onToggleLock,
  onPointerDown,
}: EntityProps) {
  const entityTypeTooltip = {
    [EntityType.Peer]: "Peer",
    [EntityType.Link]: "Link",
    [EntityType.Obstacle]: "Obstacle",
  }[entity.type];

  const entityTypeIcon = {
    [EntityType.Peer]: <Radio size={13} />,
    [EntityType.Link]: <Link size={13} />,
    [EntityType.Obstacle]: <SquareSlash size={13} />,
  }[entity.type];

  return (
    <div
      className={`navigation__entity-item${isSelected ? " navigation__entity-item--selected" : ""}${isDragging ? " navigation__entity-item--dragging" : ""}`}
      onClick={onSelect}
      onPointerDown={onPointerDown}
    >
      <Tooltip content={entityTypeTooltip}>
        <span className="navigation__entity-type">{entityTypeIcon}</span>
      </Tooltip>
      <span className="navigation__entity-title">{entity.name}</span>
      <Tooltip content={entity.locked ? "Unlock" : "Lock"}>
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
      </Tooltip>
    </div>
  );
}
