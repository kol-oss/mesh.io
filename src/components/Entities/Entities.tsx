import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Link, Plus, Radio, SquareSlash } from "lucide-react";
import { createPortal } from "react-dom";

import { storageKeys } from "../../constants/storage";
import { useListReorder } from "../../hooks/useListReorder";
import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import { useToast } from "../../hooks/useToast";
import { EntityType } from "../../types/enums";
import type { NetworkEntity } from "../../types/navigation";
import { generateUUID } from "../../utils/uuid";
import {
  migrateEntities,
  obstacleDefaults,
  peerDefaults,
} from "../../utils/navigation/entityMigration";
import TooltipAnchor from "../Tooltip/TooltipAnchor";
import Entity from "./Entity";

type EntitiesProps = {
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

export default function Entities({
  entities,
  setEntities,
  selectedId,
  onSelect,
  onClearSelection,
}: EntitiesProps) {
  const [isOpened, setIsOpened] = useLocalStorage<boolean>(storageKeys.entitiesOpened, false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const { showToast } = useToast();
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuFloatingRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  const { dragIndex, dropIndex, suppressNextClickRef, handleItemPointerDown } = useListReorder({
    items: entities,
    setItems: setEntities,
    containerRef: itemsContainerRef,
    itemSelector: ".navigation__entity-item",
  });

  useEffect(() => {
    const migratedEntities = migrateEntities(entities);
    if (!migratedEntities) {
      return;
    }
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

  useEffect(() => {
    if (!isAddMenuOpen) {
      return;
    }

    const onWindowMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        (addMenuRef.current && addMenuRef.current.contains(targetNode)) ||
        (addMenuFloatingRef.current && addMenuFloatingRef.current.contains(targetNode))
      ) {
        return;
      }
      setIsAddMenuOpen(false);
    };

    window.addEventListener("mousedown", onWindowMouseDown);
    return () => window.removeEventListener("mousedown", onWindowMouseDown);
  }, [isAddMenuOpen]);

  const toggleOpen = () => setIsOpened(!isOpened);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddEntityClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isOpened) {
      setIsOpened(true);
    }

    const triggerRect = addButtonRef.current?.getBoundingClientRect();
    if (triggerRect) {
      setAddMenuPosition({
        top: triggerRect.top + triggerRect.height / 2,
        left: triggerRect.right + 6,
      });
    }
    setIsAddMenuOpen((prev) => !prev);
  };

  const handleCreateEntity = (type: NetworkEntity["type"]) => {
    const newEntity: NetworkEntity =
      type === EntityType.Peer
        ? {
            id: generateUUID(),
            name: "Peer",
            type: EntityType.Peer,
            ...peerDefaults,
            x: 0,
            y: 0,
          }
        : type === EntityType.Link
          ? {
              id: generateUUID(),
              name: "Link",
              type: EntityType.Link,
              sourcePeerId: null,
              destinationPeerId: null,
              enabled: true,
            }
          : {
              id: generateUUID(),
              name: "Obstacle",
              type: EntityType.Obstacle,
              x: 0,
              y: 0,
              width: obstacleDefaults.width,
              height: obstacleDefaults.height,
            };

    const updatedEntities = [...entities, newEntity];
    setEntities(updatedEntities);
    onSelect(newEntity.id);
    setIsAddMenuOpen(false);
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
        <div className="navigation__entities-add-wrap" ref={addMenuRef}>
          <TooltipAnchor content="Add new entity">
            <button
              ref={addButtonRef}
              className="navigation__entities-add"
              onClick={handleAddEntityClick}
              type="button"
              aria-label="Add new entity"
            >
              <Plus size={14} />
            </button>
          </TooltipAnchor>
        </div>

        {isAddMenuOpen &&
          addMenuPosition &&
          createPortal(
            <div
              className="navigation__entities-add-menu"
              ref={addMenuFloatingRef}
              style={{ top: `${addMenuPosition.top}px`, left: `${addMenuPosition.left}px` }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity(EntityType.Peer)}
                type="button"
              >
                <Radio size={12} />
                Peer
              </button>
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity(EntityType.Link)}
                type="button"
              >
                <Link size={12} />
                Link
              </button>
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity(EntityType.Obstacle)}
                type="button"
              >
                <SquareSlash size={12} />
                Obstacle
              </button>
            </div>,
            document.body,
          )}
      </div>

      {isOpened && (
        <div
          className={`navigation__entities-items${dragIndex !== null ? " navigation__entities-items--reordering" : ""}`}
          ref={itemsContainerRef}
        >
          {entities.map((networkEntity, index) => (
            <Fragment key={networkEntity.id}>
              {dragIndex !== null && dropIndex === index && (
                <div className="navigation__entity-drop-indicator" />
              )}
              <Entity
                entity={networkEntity}
                isSelected={selectedId === networkEntity.id}
                isDragging={dragIndex === index}
                onSelect={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  onSelect(networkEntity.id);
                }}
                onToggleLock={() => handleToggleLock(networkEntity.id)}
                onPointerDown={(e) => handleItemPointerDown(index, e)}
              />
            </Fragment>
          ))}
          {dragIndex !== null && dropIndex === entities.length && (
            <div className="navigation__entity-drop-indicator" />
          )}
        </div>
      )}
    </div>
  );
}
