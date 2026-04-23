import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipAnchorProps = {
  content: string;
  children: ReactNode;
};

type TooltipPosition = {
  top: number;
  left: number;
};

const TOOLTIP_DELAY_MS = 700;

export default function TooltipAnchor({ content, children }: TooltipAnchorProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const clearTooltipTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();

    setPosition({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

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

    updatePosition();

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
        ref={anchorRef}
        className="navigation__tooltip-anchor"
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
            className="navigation__tooltip"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
            role="tooltip"
          >
            <span className="navigation__tooltip-content">{content}</span>
            <span className="navigation__tooltip-arrow" />
          </div>,
          document.body,
        )}
    </>
  );
}
