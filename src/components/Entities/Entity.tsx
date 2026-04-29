import { type PointerEvent as ReactPointerEvent } from "react";
import { Link, Lock, LockOpen, Radio, SquareSlash } from "lucide-react";
import { ui } from "../../i18n/messages";
import { EntityType } from "../../types/enums";
import type { NetworkEntity } from "../../types/entities";
import Tooltip from "../Tooltip/Tooltip";

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
    [EntityType.Peer]: ui.entities.typePeer,
    [EntityType.Link]: ui.entities.typeLink,
    [EntityType.Obstacle]: ui.entities.typeObstacle,
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
      <Tooltip content={entity.locked ? ui.entities.actionUnlock : ui.entities.actionLock}>
        <button
          className={`navigation__entity-lock ${entity.locked ? "navigation__entity-lock--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          type="button"
          aria-label={entity.locked ? ui.entities.actionUnlock : ui.entities.actionLock}
        >
          {entity.locked ? <Lock size={11} /> : <LockOpen size={11} />}
        </button>
      </Tooltip>
    </div>
  );
}
