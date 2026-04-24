import {
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Plus } from "lucide-react";

import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import { useToast } from "../../hooks/useToast";
import type { NetworkEntity } from "../../types/navigation";
import { generateUUID } from "../../utils/uuid";
import TooltipAnchor from "../Tooltip/TooltipAnchor";
import EntityListItem from "./EntityListItem";

const PEER_DEFAULTS = {
  x: 300,
  y: 100,
  range: 75,
  enabled: true,
  protocols: ["BATMAN" as const],
  batmanOgmInterval: 1,
  batmanPurgeTimeout: 10,
};

const LINK_DEFAULTS = {
  sourcePeerId: null,
  destinationPeerId: null,
  enabled: true,
};

const hasPeerDefaults = (entity: NetworkEntity) => {
  if (entity.type !== "PEER") {
    return true;
  }

  return (
    typeof entity.x === "number" &&
    typeof entity.y === "number" &&
    typeof entity.range === "number" &&
    typeof entity.enabled === "boolean" &&
    Array.isArray(entity.protocols) &&
    typeof entity.batmanOgmInterval === "number" &&
    typeof entity.batmanPurgeTimeout === "number"
  );
};

const hasLinkDefaults = (entity: NetworkEntity) => {
  if (entity.type !== "LINK") {
    return true;
  }

  return (
    (entity.sourcePeerId === null || typeof entity.sourcePeerId === "string") &&
    (entity.destinationPeerId === null || typeof entity.destinationPeerId === "string") &&
    typeof entity.enabled === "boolean"
  );
};

type EntityListProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function EntityList({
  entities,
  setEntities,
  selectedId,
  onSelect,
  onClearSelection,
}: EntityListProps) {
  const [isOpened, setIsOpened] = useLocalStorage<boolean>("mesh_entities_opened", false);
  const { showToast } = useToast();

  useEffect(() => {
    const requiresMigration = entities.some((entity) => {
      const normalizedType = (entity as NetworkEntity | { type: string }).type;
      const hasId = "id" in entity;
      return (
        normalizedType === "ROUTER" ||
        !hasPeerDefaults(entity) ||
        !hasLinkDefaults(entity) ||
        !hasId
      );
    });
    if (!requiresMigration) {
      return;
    }

    const migratedEntities = entities.map((entity) => {
      const normalizedType = (entity as NetworkEntity | { type: string }).type;
      const baseEntity = {
        ...entity,
        id: "id" in entity ? entity.id : generateUUID(),
      };

      if (normalizedType === "ROUTER") {
        return {
          ...baseEntity,
          type: "PEER" as const,
          ...PEER_DEFAULTS,
        };
      }

      if (entity.type !== "PEER") {
        if (entity.type === "LINK") {
          return {
            ...LINK_DEFAULTS,
            ...baseEntity,
            type: "LINK" as const,
          };
        }

        return baseEntity;
      }

      return {
        ...PEER_DEFAULTS,
        ...baseEntity,
        type: "PEER" as const,
      };
    });
    setEntities(migratedEntities);
  }, [entities, setEntities]);

  const handleDeleteEntity = useCallback(() => {
    if (!selectedId) return;
    const entity = entities.find((e) => e.id === selectedId);
    if (entity?.locked) {
      showToast(`Entity "${entity.name}" is locked`);
      return;
    }
    const index = entities.findIndex((e) => e.id === selectedId);
    const updatedEntities = entities.filter((e) => e.id !== selectedId);
    setEntities(updatedEntities);
    showToast(`Entity deleted`);
    const nextEntity = updatedEntities[index] ?? updatedEntities[index - 1];
    if (nextEntity) {
      onSelect(nextEntity.id);
    } else {
      onClearSelection();
    }
  }, [selectedId, entities, setEntities, showToast, onSelect, onClearSelection]);

  const handleToggleLock = useCallback(
    (id: string) => {
      const updatedEntities = entities.map((e) => (e.id === id ? { ...e, locked: !e.locked } : e));
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
    if (!isOpened) {
      setIsOpened(true);
    }

    const newEntity: NetworkEntity = {
      id: generateUUID(),
      name: `Entity ${entities.length + 1}`,
      type: "PEER",
      ...PEER_DEFAULTS,
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
              key={networkEntity.id}
              entity={networkEntity}
              isSelected={selectedId === networkEntity.id}
              onSelect={() => onSelect(networkEntity.id)}
              onToggleLock={() => handleToggleLock(networkEntity.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
