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

type ResizeSide = "left" | "right";

type UseSidebarResizeOptions = {
  side?: ResizeSide;
};

export function useSidebarResize(options?: UseSidebarResizeOptions) {
  const side = options?.side ?? "left";
  const [widthPercent, setWidthPercent] = useState(SIDEBAR_MIN_WIDTH_PERCENT);
  const isResizing = useRef(false);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!isResizing.current) {
        return;
      }

      const nextWidth =
        side === "left"
          ? (event.clientX / window.innerWidth) * 100
          : ((window.innerWidth - event.clientX) / window.innerWidth) * 100;
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
  }, [side]);

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
