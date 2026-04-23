import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";

type TooltipAnchorProps = {
  content: string;
  children: ReactNode;
  placement?: "top" | "bottom";
};

type TooltipPosition = {
  top: number;
  left: number;
};

const TOOLTIP_DELAY_MS = 700;
const TOOLTIP_OFFSET_PX = 8;

export default function TooltipAnchor({
  content,
  children,
  placement = "top",
}: TooltipAnchorProps) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const setAnchorRef = useCallback((node: HTMLElement | null, childRef?: Ref<HTMLElement>) => {
    anchorRef.current = node;

    if (!childRef) {
      return;
    }

    if (typeof childRef === "function") {
      childRef(node);
      return;
    }

    childRef.current = node;
  }, []);

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
    const top =
      placement === "bottom" ? rect.bottom + TOOLTIP_OFFSET_PX : rect.top - TOOLTIP_OFFSET_PX;

    setPosition({
      top,
      left: rect.left + rect.width / 2,
    });
  }, [placement]);

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

  if (isValidElement(children)) {
    const child = children as ReactElement<{
      ref?: Ref<HTMLElement>;
      onMouseEnter?: MouseEventHandler<HTMLElement>;
      onMouseLeave?: MouseEventHandler<HTMLElement>;
      onFocus?: FocusEventHandler<HTMLElement>;
      onBlur?: FocusEventHandler<HTMLElement>;
    }>;

    const childProps = child.props;

    return (
      <>
        {cloneElement(child, {
          ref: (node: HTMLElement | null) => setAnchorRef(node, childProps.ref),
          onMouseEnter: (event) => {
            childProps.onMouseEnter?.(event);
            showTooltip();
          },
          onMouseLeave: (event) => {
            childProps.onMouseLeave?.(event);
            hideTooltip();
          },
          onFocus: (event) => {
            childProps.onFocus?.(event);
            showTooltip();
          },
          onBlur: (event) => {
            childProps.onBlur?.(event);
            hideTooltip();
          },
        })}
        {isVisible &&
          position &&
          createPortal(
            <div
              className={`navigation__tooltip navigation__tooltip--${placement}`}
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

  return (
    <>
      <span
        ref={(node) => {
          setAnchorRef(node);
        }}
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
            className={`navigation__tooltip navigation__tooltip--${placement}`}
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
