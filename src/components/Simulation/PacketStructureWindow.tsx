import { X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { ui } from "../../i18n/messages";
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
      aria-label={ui.packet.inspectorAria}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{ui.packet.title}</h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={ui.packet.closeAria}
        >
          <X size={14} />
        </button>
      </header>
      <section className="simulation-panel__section">
        {eventMessage?.kind === SimulationMessageKind.BatmanOriginatorMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={ui.packet.structureAria}>
            {getBatmanOgmStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`${rowIndex}-${field.label}`}
                    className={`simulation-panel__packet-field${field.blocked ? " simulation-panel__packet-field--blocked" : ""}`}
                    style={{ flex: field.bits }}
                  >
                    <span className="simulation-panel__packet-field-label">{field.label}</span>
                    <span className="simulation-panel__packet-field-value">{field.value}</span>
                    <span className="simulation-panel__packet-tooltip" role="tooltip">
                      <span className="simulation-panel__packet-tooltip-bits">
                        {field.bits} {ui.packet.bitsSuffix}
                      </span>
                      {field.blocked ? (
                        <span className="simulation-panel__packet-tooltip-note">
                          {ui.packet.notModeled}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="simulation-panel__description simulation-panel__description--secondary">
            {ui.packet.unavailable}
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
      { label: ui.packet.fieldVersion, value: String(message.version), bits: 8, blocked: false },
      { label: ui.packet.fieldFlags, value: ui.packet.notAvailable, bits: 8, blocked: true },
      { label: ui.packet.fieldTtl, value: String(message.timeToLive), bits: 8, blocked: false },
      {
        label: ui.packet.fieldThroughput,
        value: String(message.throughput),
        bits: 8,
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldSequenceNumber,
        value: String(message.sequence),
        bits: 16,
        blocked: false,
      },
      { label: ui.packet.fieldGwFlags, value: ui.packet.notAvailable, bits: 8, blocked: true },
      { label: ui.packet.fieldGwPort, value: ui.packet.notAvailable, bits: 16, blocked: true },
    ],
    [
      {
        label: ui.packet.fieldOriginatorAddress,
        value: peerNameById.get(message.sourcePeerId) ?? message.sourcePeerId,
        bits: 32,
        blocked: false,
      },
      {
        label: ui.packet.fieldSenderAddress,
        value: peerNameById.get(message.senderPeerId) ?? message.senderPeerId,
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
