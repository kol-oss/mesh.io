import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TooltipPlacement } from "@/shared/types/view/view";

type TooltipProps = {
  content: string;
  children: ReactNode;
  placement?: TooltipPlacement;
};

type TooltipPosition = {
  top: number;
  left: number;
};

const TOOLTIP_DELAY_MS = 700;
const TOOLTIP_OFFSET_PX = 8;

export default function Tooltip({
  content,
  children,
  placement = TooltipPlacement.Top,
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const setAnchorRef = useCallback((node: HTMLSpanElement | null) => {
    anchorRef.current = node;
  }, []);

  const getAnchorElement = useCallback(() => {
    if (!anchorRef.current) {
      return null;
    }

    const childElement = anchorRef.current.firstElementChild;
    if (childElement instanceof HTMLElement) {
      return childElement;
    }

    return anchorRef.current;
  }, []);

  const clearTooltipTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const anchorNode = getAnchorElement();

    if (!anchorNode) {
      return;
    }

    const rect = anchorNode.getBoundingClientRect();
    const top =
      placement === TooltipPlacement.Bottom
        ? rect.bottom + TOOLTIP_OFFSET_PX
        : rect.top - TOOLTIP_OFFSET_PX;

    setPosition({
      top,
      left: rect.left + rect.width / 2,
    });
  }, [getAnchorElement, placement]);

  const showTooltip = useCallback(() => {
    clearTooltipTimeout();

    timeoutRef.current = window.setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, TOOLTIP_DELAY_MS);
  }, [clearTooltipTimeout, updatePosition]);

  const hideTooltip = useCallback(() => {
    clearTooltipTimeout();
    setIsVisible(false);
  }, [clearTooltipTimeout]);

  useLayoutEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleViewportChange = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [isVisible, updatePosition]);

  useEffect(() => {
    return () => {
      clearTooltipTimeout();
    };
  }, [clearTooltipTimeout]);

  return (
    <>
      <span
        ref={(node) => {
          setAnchorRef(node);
        }}
        className="tooltip__anchor"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </span>
      {isVisible &&
        position &&
        createPortal(
          <div
            className={`tooltip tooltip--${placement}`}
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
            role="tooltip"
          >
            <span className="tooltip__content">{content}</span>
            <span className="tooltip__arrow" />
          </div>,
          document.body,
        )}
    </>
  );
}
