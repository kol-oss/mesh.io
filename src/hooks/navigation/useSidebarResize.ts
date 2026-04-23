import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { clamp } from "../../utils/math/clamp";
import {
  SIDEBAR_MAX_WIDTH_PERCENT,
  SIDEBAR_MIN_WIDTH_PERCENT,
} from "../../utils/navigation/constants";

export function useSidebarResize() {
  const [widthPercent, setWidthPercent] = useState(SIDEBAR_MIN_WIDTH_PERCENT);
  const isResizing = useRef(false);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!isResizing.current) {
        return;
      }

      const nextWidth = (event.clientX / window.innerWidth) * 100;
      setWidthPercent(clamp(nextWidth, SIDEBAR_MIN_WIDTH_PERCENT, SIDEBAR_MAX_WIDTH_PERCENT));
    };

    const onPointerUp = () => {
      if (!isResizing.current) {
        return;
      }

      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const onResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  return {
    widthPercent,
    onResizeStart,
  };
}
