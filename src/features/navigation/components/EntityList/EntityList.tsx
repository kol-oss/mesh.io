import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ChevronRight, Link, Plus, Radio, SquareSlash } from "lucide-react";
import { createPortal } from "react-dom";
import { useListReorder } from "@/shared/hooks/useListReorder";
import { useToast } from "@/shared/toast/useToast";
import { EntityType } from "@/shared/types/model/entities";
import type { NetworkEntity } from "@/shared/types/model/entities";
import { SelectionType as SelectionSource } from "@/shared/types/view/selection";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import {
  migrateEntities,
  obstacleDefaults,
  peerDefaults,
} from "@/shared/utils/navigation/entityMigration";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { useNavigationRedux } from "@/features/navigation/hooks/useNavigationRedux";
import EntityRecord from "../EntityRecord/EntityRecord";

export default function EntityList() {
  const {
    entities,
    setEntities,
    selectedId,
    selectedSource,
    entitiesOpened,
    onEntitiesOpenedChange,
    onEntitySelect,
    onClearSelection,
  } = useNavigationRedux();
  const selectedEntityId = selectedSource === SelectionSource.Entities ? selectedId : null;

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
    if (!selectedEntityId) {
      return;
    }

    const entity = entities.find((item) => item.id === selectedEntityId);
    if (entity?.locked) {
      showToast(`Entity "${entity.name}" is locked`);
      return;
    }

    const index = entities.findIndex((item) => item.id === selectedEntityId);
    const updatedEntities = entities.filter((item) => item.id !== selectedEntityId);
    setEntities(updatedEntities);
    showToast("Entity deleted");
    const nextEntity = updatedEntities[index] ?? updatedEntities[index - 1];
    if (nextEntity) {
      onEntitySelect(nextEntity.id);
    } else {
      onClearSelection();
    }
  }, [entities, onClearSelection, onEntitySelect, selectedEntityId, setEntities, showToast]);

  const handleToggleLock = useCallback(
    (id: UUID) => {
      const updatedEntities = entities.map((entity) =>
        entity.id === id ? { ...entity, locked: !entity.locked } : entity,
      );
      setEntities(updatedEntities);
    },
    [entities, setEntities],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete" && selectedEntityId && entitiesOpened) {
        handleDeleteEntity();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEntityId, entitiesOpened, handleDeleteEntity]);

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

  const toggleOpen = () => onEntitiesOpenedChange(!entitiesOpened);

  const handleHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  const handleAddEntityClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!entitiesOpened) {
      onEntitiesOpenedChange(true);
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
    onEntitySelect(newEntity.id);
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
        aria-expanded={entitiesOpened}
      >
        <ChevronRight
          size={10}
          className={`navigation__entities-chevron ${
            entitiesOpened ? "navigation__entities-chevron--open" : ""
          }`}
        />
        <span className="navigation__entities-title">{"Entities"}</span>
        <div className="navigation__entities-add-wrap" ref={addMenuRef}>
          <Tooltip content={"Add new entity"}>
            <button
              ref={addButtonRef}
              className="navigation__entities-add"
              onClick={handleAddEntityClick}
              type="button"
              aria-label={"Add new entity"}
            >
              <Plus size={14} />
            </button>
          </Tooltip>
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
                {"Peer"}
              </button>
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity(EntityType.Link)}
                type="button"
              >
                <Link size={12} />
                {"Link"}
              </button>
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity(EntityType.Obstacle)}
                type="button"
              >
                <SquareSlash size={12} />
                {"Obstacle"}
              </button>
            </div>,
            document.body,
          )}
      </div>

      {entitiesOpened && (
        <div
          className={`navigation__entities-items${dragIndex !== null ? " navigation__entities-items--reordering" : ""}`}
          ref={itemsContainerRef}
        >
          {entities.map((networkEntity, index) => (
            <Fragment key={networkEntity.id}>
              {dragIndex !== null && dropIndex === index && (
                <div className="navigation__entity-drop-indicator" />
              )}
              <EntityRecord
                entity={networkEntity}
                isSelected={selectedEntityId === networkEntity.id}
                isDragging={dragIndex === index}
                onSelect={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }
                  onEntitySelect(networkEntity.id);
                }}
                onToggleLock={() => handleToggleLock(networkEntity.id)}
                onPointerDown={(event) => handleItemPointerDown(index, event)}
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
