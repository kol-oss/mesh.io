import { EventType, type Event, type StatusChangeEventDetails } from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { type StepResult } from "@/shared/types/common/simulation";
import type { UUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import { getEventDetailsType, getEventProtocol } from "@/shared/utils/events";
import { getPeerLabel, renderPeerName } from "@/shared/utils/simulation/eventPresentation";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { getEventLink } from "../../constants/links";
import { getEventTitle } from "../../constants/titles";
import AodvDescription from "./AodvDescription";
import BatmanDescription from "./BatmanDescription";
import DsdvDescription from "./DsdvDescription";
import DsrDescription from "./DsrDescription";
import OlsrDescription from "./OlsrDescription";
import SystemDescription from "./SystemDescription";

type EventDescriptionProps = {
  anchorX: number;
  anchorY: number;
  canGoNextEvent: boolean;
  canGoPrevEvent: boolean;
  currentEvent: Event | null;
  currentEventIndex: number;
  currentEventsTotal: number;
  currentStepResult: StepResult | null;
  isTqDisclosureOpen: boolean;
  isSequenceDisclosureOpen: boolean;
  onPeerHoverChange: (peerId: UUID | null) => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
  onTqDisclosureToggle: (eventId: UUID) => void;
  onSequenceDisclosureToggle: (eventId: UUID) => void;
};

export default function EventDescription({
  anchorX,
  anchorY,
  canGoNextEvent,
  canGoPrevEvent,
  currentEvent,
  currentEventIndex,
  currentEventsTotal,
  currentStepResult,
  onPeerHoverChange,
  onNextEvent,
  onPrevEvent,
}: EventDescriptionProps) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      setDragOffset({
        x: dragState.startOffsetX + (event.clientX - dragState.startPointerX),
        y: dragState.startOffsetY + (event.clientY - dragState.startPointerY),
      });
    };

    const handlePointerEnd = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [isDragging]);

  if (!currentStepResult || !currentEvent) {
    return null;
  }

  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );

  const detailsType = getEventDetailsType(currentEvent);
  const title = getEventTitle(detailsType);

  const eventOwner = (() => {
    if (currentEvent.type === EventType.StatusChange) {
      const details = currentEvent.details as StatusChangeEventDetails;
      if (details.entityType === EntityType.Link) {
        return "Link";
      }

      if (peerNameById.has(details.entityId)) {
        return renderPeerName(
          details.entityId,
          getPeerLabel(details.entityId, peerNameById),
          onPeerHoverChange,
        );
      }
    }

    return peerNameById.has(currentEvent.peerId)
      ? renderPeerName(
          currentEvent.peerId,
          getPeerLabel(currentEvent.peerId, peerNameById),
          onPeerHoverChange,
        )
      : currentEvent.peerId;
  })();

  const documentationLink = getEventLink(currentEvent, detailsType);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startOffsetX: dragOffset.x,
      startOffsetY: dragOffset.y,
    };
    setIsDragging(true);
    event.stopPropagation();
    event.preventDefault();
  };

  const protocol = getEventProtocol(currentEvent);
  return (
    <aside
      className={`simulation-panel simulation-panel--tooltip${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label={"Simulation event"}
      onPointerDown={handlePointerDown}
      onMouseLeave={() => onPeerHoverChange(null)}
      style={{ left: `${anchorX + dragOffset.x}px`, top: `${anchorY + dragOffset.y}px` }}
    >
      {/* Header */}
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{title}</h2>
        <span className="simulation-panel__tick">{eventOwner}</span>
      </header>

      {/* Body */}
      <section className="simulation-panel__section">
        {protocol === RoutingProtocol.BATMAN && (
          <BatmanDescription
            event={currentEvent}
            detailsType={detailsType}
            peers={currentStepResult.snapshot.peers}
            onPeerHover={onPeerHoverChange}
          />
        )}

        {protocol === RoutingProtocol.DSDV && (
          <DsdvDescription
            event={currentEvent}
            detailsType={detailsType}
            peers={currentStepResult.snapshot.peers}
            onPeerHover={onPeerHoverChange}
          />
        )}

        {protocol === RoutingProtocol.AODV && (
          <AodvDescription
            event={currentEvent}
            detailsType={detailsType}
            peers={currentStepResult.snapshot.peers}
            onPeerHover={onPeerHoverChange}
          />
        )}

        {protocol === RoutingProtocol.OLSR && (
          <OlsrDescription
            event={currentEvent}
            detailsType={detailsType}
            peers={currentStepResult.snapshot.peers}
            onPeerHover={onPeerHoverChange}
          />
        )}

        {protocol === RoutingProtocol.DSR && (
          <DsrDescription
            event={currentEvent}
            detailsType={detailsType}
            peers={currentStepResult.snapshot.peers}
            onPeerHover={onPeerHoverChange}
          />
        )}

        {protocol === undefined && (
          <SystemDescription
            event={currentEvent}
            peers={currentStepResult.snapshot.peers}
            onPeerHover={onPeerHoverChange}
          />
        )}
      </section>

      {/* Footer */}
      <footer className="simulation-panel__footer">
        <Link
          className="simulation-panel__read-more"
          to={documentationLink}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} />
          {"Read more"}
        </Link>

        <div className="simulation-panel__pager simulation-panel__pager--footer">
          <button
            className="simulation-panel__pager-button"
            type="button"
            onClick={onPrevEvent}
            disabled={!canGoPrevEvent}
            aria-label={"Previous event"}
          >
            <ChevronLeft size={18} />
          </button>

          <span className="simulation-panel__pager-label">
            {`${currentEventIndex + (currentEventsTotal !== 0 ? 1 : 0)}/${currentEventsTotal}`}
          </span>

          <button
            className="simulation-panel__pager-button"
            type="button"
            onClick={onNextEvent}
            disabled={!canGoNextEvent}
            aria-label={"Next event"}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </aside>
  );
}
