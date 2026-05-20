import { TooltipPlacement } from "@/shared/types/view/view";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  content: string;
  children: ReactNode;
  placement?: TooltipPlacement;
  anchorClassName?: string;
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
  anchorClassName,
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
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
    const tooltipNode = tooltipRef.current;

    if (!anchorNode || !tooltipNode) {
      return;
    }

    const anchorRect = anchorNode.getBoundingClientRect();
    const tooltipRect = tooltipNode.getBoundingClientRect();
    const left = anchorRect.left + anchorRect.width / 2 - tooltipRect.width / 2;
    const top =
      placement === TooltipPlacement.Bottom
        ? anchorRect.bottom + TOOLTIP_OFFSET_PX
        : anchorRect.top - tooltipRect.height - TOOLTIP_OFFSET_PX;

    setPosition({
      top,
      left,
    });
  }, [getAnchorElement, placement]);

  const showTooltip = useCallback(() => {
    clearTooltipTimeout();

    timeoutRef.current = window.setTimeout(() => {
      setPosition(null);
      setIsVisible(true);
    }, TOOLTIP_DELAY_MS);
  }, [clearTooltipTimeout]);

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
        ref={(node) => {
          setAnchorRef(node);
        }}
        className={`tooltip__anchor${anchorClassName ? ` ${anchorClassName}` : ""}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </span>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`tooltip tooltip--${placement}`}
            style={{
              left: `${position?.left ?? 0}px`,
              top: `${position?.top ?? 0}px`,
              visibility: position ? "visible" : "hidden",
            }}
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
