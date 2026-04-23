import { Lock, LockOpen } from "lucide-react";
import type { NetworkEntity } from "../../types/navigation";

type EntityListItemProps = {
  entity: NetworkEntity;
  isSelected: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
};

export default function EntityListItem({
  entity,
  isSelected,
  onSelect,
  onToggleLock,
}: EntityListItemProps) {
  return (
    <div
      className={`navigation__entity-item ${isSelected ? "navigation__entity-item--selected" : ""}`}
      onClick={onSelect}
    >
      <span className="navigation__entity-type">{entity.type}</span>
      <span className="navigation__entity-title">{entity.name}</span>
      <button
        className={`navigation__entity-lock ${entity.locked ? "navigation__entity-lock--active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
        type="button"
        aria-label={entity.locked ? "Unlock entity" : "Lock entity"}
      >
        {entity.locked ? <Lock size={11} /> : <LockOpen size={11} />}
      </button>
    </div>
  );
}
