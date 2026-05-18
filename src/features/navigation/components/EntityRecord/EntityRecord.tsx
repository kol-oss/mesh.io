import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { getEntityTypeIcon } from "@/shared/constants/icons";
import { getEntityTypeName } from "@/shared/constants/names";
import type { NetworkEntity } from "@/shared/types/model/entities";
import { Lock, LockOpen } from "lucide-react";
import { type PointerEvent as ReactPointerEvent } from "react";

type EntityRecordProps = {
  entity: NetworkEntity;
  isSelected: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export default function EntityRecord({
  entity,
  isSelected,
  onSelect,
  onToggleLock,
  onPointerDown,
}: EntityRecordProps) {
  const { type, locked } = entity;
  const icon = getEntityTypeIcon(type, 13);

  const lockMessage = locked ? "Unlock" : "Lock";
  return (
    <div
      className={`navigation__entity-item${isSelected ? " navigation__entity-item--selected" : ""}`}
      onClick={onSelect}
      onPointerDown={onPointerDown}
    >
      <Tooltip content={getEntityTypeName(type)}>
        <span className="navigation__entity-type">{icon}</span>
      </Tooltip>
      <span className="navigation__entity-title">{entity.name}</span>
      <Tooltip content={lockMessage}>
        <button
          className={`navigation__entity-lock ${locked ? "navigation__entity-lock--active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleLock();
          }}
          type="button"
          aria-label={lockMessage}
        >
          {locked ? <Lock size={11} /> : <LockOpen size={11} />}
        </button>
      </Tooltip>
    </div>
  );
}
