import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type DropBounds = {
  min: number;
  max: number;
};

type UseListReorderOptions<T> = {
  items: T[];
  setItems: (value: T[]) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemSelector: string;
  canStartDrag?: (params: { index: number; items: T[] }) => boolean;
  getDropBounds?: (params: { index: number; items: T[] }) => DropBounds | null;
};

const clampIndex = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function useListReorder<T>({
  items,
  setItems,
  containerRef,
  itemSelector,
  canStartDrag,
  getDropBounds,
}: UseListReorderOptions<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const itemsRef = useRef(items);
  const dragIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  const boundsRef = useRef<DropBounds | null>(null);
  const isDraggingRef = useRef(false);
  const pointerStartYRef = useRef(0);
  const suppressNextClickRef = useRef(false);

  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useLayoutEffect(() => {
    dropIndexRef.current = dropIndex;
  }, [dropIndex]);

  const handleItemPointerDown = useCallback(
    (index: number, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      if (canStartDrag && !canStartDrag({ index, items: itemsRef.current })) {
        dragIndexRef.current = null;
        boundsRef.current = null;
        return;
      }

      const bounds = getDropBounds ? getDropBounds({ index, items: itemsRef.current }) : null;
      if (getDropBounds && !bounds) {
        dragIndexRef.current = null;
        boundsRef.current = null;
        return;
      }

      dragIndexRef.current = index;
      isDraggingRef.current = false;
      pointerStartYRef.current = event.clientY;
      boundsRef.current = bounds;
    },
    [canStartDrag, getDropBounds],
  );

  useEffect(() => {
    const dragThreshold = 5;

    const onPointerMove = (event: PointerEvent) => {
      if (dragIndexRef.current === null) {
        return;
      }

      if (
        !isDraggingRef.current &&
        Math.abs(event.clientY - pointerStartYRef.current) < dragThreshold
      ) {
        return;
      }

      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
        setDragIndex(dragIndexRef.current);
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const itemNodes = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));
      let rawDropIndex = itemNodes.length;

      for (let index = 0; index < itemNodes.length; index += 1) {
        const rect = itemNodes[index].getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          rawDropIndex = index;
          break;
        }
      }

      const bounds = boundsRef.current;
      const nextDropIndex = bounds
        ? clampIndex(rawDropIndex, bounds.min, bounds.max)
        : rawDropIndex;

      setDropIndex(nextDropIndex);
      dropIndexRef.current = nextDropIndex;
    };

    const onPointerUp = () => {
      if (dragIndexRef.current === null) {
        return;
      }

      if (isDraggingRef.current && dropIndexRef.current !== null) {
        const from = dragIndexRef.current;
        const to = dropIndexRef.current;
        const nextItems = [...itemsRef.current];
        const [removed] = nextItems.splice(from, 1);
        nextItems.splice(to > from ? to - 1 : to, 0, removed);
        setItems(nextItems);
        suppressNextClickRef.current = true;
      }

      dragIndexRef.current = null;
      isDraggingRef.current = false;
      boundsRef.current = null;
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
  }, [containerRef, itemSelector, setItems]);

  return {
    dragIndex,
    dropIndex,
    suppressNextClickRef,
    handleItemPointerDown,
  };
}
