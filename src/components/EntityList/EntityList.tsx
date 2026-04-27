import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronRight, Link, Plus, Radio, SquareSlash } from "lucide-react";
import { createPortal } from "react-dom";

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

const OBSTACLE_DEFAULTS = {
  x: 200,
  y: 200,
  width: 100,
  height: 60,
};

const hasPeerDefaults = (entity: NetworkEntity) => {
  if (entity.type !== "PEER") {
    return true;
  }

  return (
    typeof entity.x === "number" &&
    typeof entity.y === "number" &&
    typeof entity.range === "number" &&
    entity.range > 0 &&
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

const hasObstacleDefaults = (entity: NetworkEntity) => {
  if (entity.type !== "OBSTACLE") {
    return true;
  }

  return (
    typeof entity.x === "number" &&
    typeof entity.y === "number" &&
    typeof entity.width === "number" &&
    Number.isFinite(entity.width) &&
    entity.width > 0 &&
    typeof entity.height === "number" &&
    Number.isFinite(entity.height) &&
    entity.height > 0
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
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const { showToast } = useToast();

  // Drag-to-reorder
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const pointerStartYRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuFloatingRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const entitiesRef = useRef(entities);

  useLayoutEffect(() => {
    entitiesRef.current = entities;
  });

  useLayoutEffect(() => {
    dropIndexRef.current = dropIndex;
  });

  useEffect(() => {
    const requiresMigration = entities.some((entity) => {
      const normalizedType = (entity as NetworkEntity | { type: string }).type;
      const hasId = "id" in entity;
      return (
        normalizedType === "ROUTER" ||
        !hasPeerDefaults(entity) ||
        !hasLinkDefaults(entity) ||
        !hasObstacleDefaults(entity) ||
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

        if (entity.type === "OBSTACLE") {
          const nextWidth =
            typeof entity.width === "number" && entity.width > 0
              ? entity.width
              : OBSTACLE_DEFAULTS.width;
          const nextHeight =
            typeof entity.height === "number" && entity.height > 0
              ? entity.height
              : OBSTACLE_DEFAULTS.height;

          return {
            ...OBSTACLE_DEFAULTS,
            ...baseEntity,
            type: "OBSTACLE" as const,
            width: nextWidth,
            height: nextHeight,
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

  const handleItemPointerDown = useCallback(
    (index: number, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragIndexRef.current = index;
      isDraggingRef.current = false;
      pointerStartYRef.current = event.clientY;
    },
    [],
  );

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    const onPointerMove = (event: PointerEvent) => {
      if (dragIndexRef.current === null) return;

      if (
        !isDraggingRef.current &&
        Math.abs(event.clientY - pointerStartYRef.current) < DRAG_THRESHOLD
      ) {
        return;
      }

      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDragIndex(dragIndexRef.current);
      }

      const container = itemsContainerRef.current;
      if (!container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(".navigation__entity-item"));
      let newDropIndex = items.length;

      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          newDropIndex = i;
          break;
        }
      }

      setDropIndex(newDropIndex);
      dropIndexRef.current = newDropIndex;
    };

    const onPointerUp = () => {
      if (dragIndexRef.current === null) return;

      if (isDraggingRef.current && dropIndexRef.current !== null) {
        const from = dragIndexRef.current;
        const to = dropIndexRef.current;
        const current = entitiesRef.current;
        const next = [...current];
        const [removed] = next.splice(from, 1);
        next.splice(to > from ? to - 1 : to, 0, removed);
        setEntities(next);
        suppressNextClickRef.current = true;
      }

      dragIndexRef.current = null;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setDragIndex(null);
      setDropIndex(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [setEntities]);

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
      type === "PEER"
        ? {
            id: generateUUID(),
            name: "Peer",
            type: "PEER",
            ...PEER_DEFAULTS,
            x: 0,
            y: 0,
          }
        : type === "LINK"
          ? {
              id: generateUUID(),
              name: "Link",
              type: "LINK",
              sourcePeerId: null,
              destinationPeerId: null,
              enabled: true,
            }
          : {
              id: generateUUID(),
              name: "Obstacle",
              type: "OBSTACLE",
              x: 0,
              y: 0,
              width: OBSTACLE_DEFAULTS.width,
              height: OBSTACLE_DEFAULTS.height,
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
                onClick={() => handleCreateEntity("PEER")}
                type="button"
              >
                <Radio size={12} />
                Peer
              </button>
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity("LINK")}
                type="button"
              >
                <Link size={12} />
                Link
              </button>
              <button
                className="navigation__entities-add-option"
                onClick={() => handleCreateEntity("OBSTACLE")}
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
              <EntityListItem
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
