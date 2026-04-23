import {
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Plus } from "lucide-react";

import { INITIAL_NETWORK_ENTITIES } from "../../utils/navigation/entities";
import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import { useToast } from "../../hooks/useToast";
import type { NetworkEntity } from "../../types/navigation";
import TooltipAnchor from "../Tooltip/TooltipAnchor";
import EntityListItem from "./EntityListItem";

type EntityListProps = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function EntityList({ selectedId, onSelect, onClearSelection }: EntityListProps) {
  const [isOpened, setIsOpened] = useLocalStorage<boolean>("mesh_entities_opened", false);
  const [entities, setEntities] = useLocalStorage<NetworkEntity[]>(
    "mesh_entities",
    INITIAL_NETWORK_ENTITIES,
  );
  const { showToast } = useToast();

  useEffect(() => {
    const hasLegacyRouterType = entities.some(
      (entity) => (entity as NetworkEntity | { type: string }).type === "ROUTER",
    );
    if (!hasLegacyRouterType) {
      return;
    }

    const migratedEntities = entities.map((entity) => {
      const normalizedType = (entity as NetworkEntity | { type: string }).type;
      return normalizedType === "ROUTER" ? { ...entity, type: "PEER" as const } : entity;
    });
    setEntities(migratedEntities);
  }, [entities, setEntities]);

  const handleDeleteEntity = useCallback(() => {
    if (!selectedId) return;
    const entity = entities.find((e) => e.name === selectedId);
    if (entity?.locked) {
      showToast(`Entity "${selectedId}" is locked`);
      return;
    }
    const index = entities.findIndex((e) => e.name === selectedId);
    const updatedEntities = entities.filter((e) => e.name !== selectedId);
    setEntities(updatedEntities);
    showToast(`Entity "${selectedId}" deleted`);
    const nextEntity = updatedEntities[index] ?? updatedEntities[index - 1];
    if (nextEntity) {
      onSelect(nextEntity.name);
    } else {
      onClearSelection();
    }
  }, [selectedId, entities, setEntities, showToast, onSelect, onClearSelection]);

  const handleToggleLock = useCallback(
    (name: string) => {
      const updatedEntities = entities.map((e) =>
        e.name === name ? { ...e, locked: !e.locked } : e,
      );
      setEntities(updatedEntities);
    },
    [entities, setEntities],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && selectedId && isOpened) {
        handleDeleteEntity();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, isOpened, handleDeleteEntity]);

  const toggleOpen = () => setIsOpened(!isOpened);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddEntity = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const newEntity: NetworkEntity = {
      name: `Entity ${entities.length + 1}`,
      type: "PEER",
    };
    const updatedEntities = [...entities, newEntity];
    setEntities(updatedEntities);
    showToast(`Entity "${newEntity.name}" added`);
  };

  return (
    <div className="navigation__entities">
      <div
        className="navigation__entities-header"
        onClick={toggleOpen}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isOpened}
      >
        <ChevronRight
          size={10}
          className={`navigation__entities-chevron ${
            isOpened ? "navigation__entities-chevron--open" : ""
          }`}
        />
        <span className="navigation__entities-title">Entities</span>
        <TooltipAnchor content="Add new entity">
          <button
            className="navigation__entities-add"
            onClick={handleAddEntity}
            type="button"
            aria-label="Add new entity"
          >
            <Plus size={14} />
          </button>
        </TooltipAnchor>
      </div>

      {isOpened && (
        <div className="navigation__entities-items">
          {entities.map((networkEntity) => (
            <EntityListItem
              key={networkEntity.name}
              entity={networkEntity}
              isSelected={selectedId === networkEntity.name}
              onSelect={() => onSelect(networkEntity.name)}
              onToggleLock={() => handleToggleLock(networkEntity.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
