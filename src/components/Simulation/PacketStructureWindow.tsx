import { X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
  SimulationMessageKind,
  type SimulationEvent,
  type SimulationMessage,
  type SimulationStepResult,
} from "../../types/simulation";

type PacketStructureWindowProps = {
  isOpen: boolean;
  currentEvent: SimulationEvent | null;
  currentStepResult: SimulationStepResult | null;
  onClose: () => void;
};

type PacketStructureField = {
  label: string;
  value: string;
  bits: number;
  blocked: boolean;
};

export default function PacketStructureWindow({
  isOpen,
  currentEvent,
  currentStepResult,
  onClose,
}: PacketStructureWindowProps) {
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

  if (!isOpen || !currentEvent || !currentStepResult) {
    return null;
  }

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

  const eventMessage = getEventMessage(currentEvent);
  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );

  return (
    <aside
      className={`simulation-panel simulation-panel--inspector${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label="Packet structure inspector"
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">BATMAN OGM Packet</h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Close packet structure"
        >
          <X size={14} />
        </button>
      </header>
      <section className="simulation-panel__section">
        {eventMessage?.kind === SimulationMessageKind.BatmanOriginatorMessage ? (
          <div
            className="simulation-panel__packet-structure"
            aria-label="BATMAN OGM packet structure"
          >
            <p className="simulation-panel__packet-structure-title">
              Originator Message (OGM), Layer 3
            </p>
            {getBatmanOgmStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`${rowIndex}-${field.label}`}
                    className={`simulation-panel__packet-field${field.blocked ? " simulation-panel__packet-field--blocked" : ""}`}
                    style={{ flex: field.bits }}
                    title={
                      field.blocked ? "This field is not represented in simulation." : undefined
                    }
                  >
                    <span className="simulation-panel__packet-field-label">{field.label}</span>
                    <span className="simulation-panel__packet-field-value">{field.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="simulation-panel__description simulation-panel__description--secondary">
            Packet structure is not available for this event.
          </p>
        )}
      </section>
    </aside>
  );
}

const getBatmanOgmStructureRows = (
  message: SimulationMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
    return [];
  }

  return [
    [
      { label: "Version", value: "N/A", bits: 5, blocked: true },
      { label: "Flags", value: "N/A", bits: 5, blocked: true },
      { label: "TTL", value: String(message.timeToLive), bits: 8, blocked: false },
      { label: "GW Flags", value: "N/A", bits: 8, blocked: true },
    ],
    [
      { label: "Sequence Number", value: String(message.sequence), bits: 16, blocked: false },
      { label: "GW Port", value: "N/A", bits: 16, blocked: true },
    ],
    [
      {
        label: "Originator Address",
        value: peerNameById.get(message.sourcePeerId) ?? message.sourcePeerId,
        bits: 32,
        blocked: false,
      },
    ],
  ];
};

const getEventMessage = (event: SimulationEvent): SimulationMessage | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as SimulationMessage;
};
