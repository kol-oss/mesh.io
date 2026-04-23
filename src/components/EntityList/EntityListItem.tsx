import type { NetworkEntity } from "../../types/navigation";

type EntityListItemProps = {
  entity: NetworkEntity;
};

export default function EntityListItem({ entity }: EntityListItemProps) {
  return (
    <div className="navigation__entity-item">
      <span className="navigation__entity-type">{entity.type}</span>
      <span className="navigation__entity-title">{entity.name}</span>
    </div>
  );
}
