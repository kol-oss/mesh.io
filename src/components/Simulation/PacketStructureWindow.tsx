import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";

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
  description: string;
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
  const inspectorTitle = getPacketInspectorTitle(eventMessage);
  const packetStructureAria = getPacketInspectorStructureAria(eventMessage);
  const readMorePath = getPacketReadMorePath(eventMessage);

  return (
    <aside
      className={`simulation-panel simulation-panel--inspector${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label={ui.packet.inspectorAria}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{inspectorTitle}</h2>
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
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
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
                      <span className="simulation-panel__packet-tooltip-description">
                        {field.description}
                      </span>
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
        ) : eventMessage?.kind === SimulationMessageKind.BatmanEchoLocationMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
            {getBatmanElpStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-elp-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`elp-${rowIndex}-${field.label}`}
                    className={`simulation-panel__packet-field${field.blocked ? " simulation-panel__packet-field--blocked" : ""}`}
                    style={{ flex: field.bits }}
                  >
                    <span className="simulation-panel__packet-field-label">{field.label}</span>
                    <span className="simulation-panel__packet-field-value">{field.value}</span>
                    <span className="simulation-panel__packet-tooltip" role="tooltip">
                      <span className="simulation-panel__packet-tooltip-description">
                        {field.description}
                      </span>
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
      <footer className="simulation-panel__footer">
        <Link
          className="simulation-panel__read-more"
          to={readMorePath}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} />
          {ui.simulation.packetStructureReadMore}
        </Link>
      </footer>
    </aside>
  );
}

const getPacketInspectorTitle = (message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return ui.packet.elpTitle;
  }

  return ui.packet.title;
};

const getPacketInspectorStructureAria = (message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return ui.packet.elpStructureAria;
  }

  return ui.packet.structureAria;
};

const getPacketReadMorePath = (message: SimulationMessage | null) => {
  if (message?.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
    return "/docs/batman#echo-location-protocol";
  }

  if (message?.kind === SimulationMessageKind.BatmanOriginatorMessage) {
    return "/docs/batman#originator-message";
  }

  return "/docs/batman#what-you-need-to-know";
};

const getBatmanOgmStructureRows = (
  message: SimulationMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
    return [];
  }

  return [
    [
      {
        label: ui.packet.fieldType,
        value: "0x06",
        bits: 8,
        description: "Identifies this packet as an OGM message.",
        blocked: false,
      },
      {
        label: ui.packet.fieldVersion,
        value: String(message.version),
        bits: 8,
        description: "OGM protocol version field.",
        blocked: false,
      },
      {
        label: ui.packet.fieldFlags,
        value: ui.packet.notAvailable,
        bits: 8,
        description: "Control flags for additional OGM semantics.",
        blocked: true,
      },
      {
        label: ui.packet.fieldTtl,
        value: String(message.timeToLive),
        bits: 8,
        description: "Maximum forwarding depth still allowed.",
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldSequenceNumber,
        value: String(message.sequence),
        bits: 32,
        description: "Sequence protection value to identify new OGMs.",
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldOriginatorAddress,
        value: peerNameById.get(message.sourcePeerId) ?? message.sourcePeerId,
        bits: 48,
        description: "MAC address of the source node that originated the route advertisement.",
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldThroughput,
        value: String(message.throughput),
        bits: 32,
        description: "Current path throughput estimate carried with the OGM.",
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldSenderAddress,
        value: peerNameById.get(message.senderPeerId) ?? message.senderPeerId,
        bits: 48,
        description: "MAC address of the last-hop node that forwarded this OGM.",
        blocked: false,
      },
    ],
  ];
};

const getBatmanElpStructureRows = (
  message: SimulationMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.kind !== SimulationMessageKind.BatmanEchoLocationMessage) {
    return [];
  }

  const neighbourRows: PacketStructureField[][] = message.neighbours.map((neighbour) => [
    {
      label: ui.packet.fieldNeighbourAddress,
      value: peerNameById.get(neighbour.address) ?? neighbour.address,
      bits: 48,
      description: "MAC address of a neighbour listed in this ELP message.",
      blocked: false,
    },
  ]);

  return [
    [
      {
        label: ui.packet.fieldType,
        value: "0x03",
        bits: 8,
        description: "Identifies this packet as an ELP message.",
        blocked: false,
      },
      {
        label: ui.packet.fieldVersion,
        value: String(message.version),
        bits: 8,
        description: "Protocol version used by the sender.",
        blocked: false,
      },
      {
        label: ui.packet.fieldTtl,
        value: String(message.timeToLive),
        bits: 8,
        description: "Remaining relay limit before the packet is discarded. Actually not used.",
        blocked: false,
      },
      {
        label: "Num Neigh",
        value: String(message.numNeighbours),
        bits: 8,
        description: "Number of neighbour entries included in this packet.",
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldSequenceNumber,
        value: String(message.sequence),
        bits: 32,
        description: "Monotonic packet number used to detect stale or repeated updates.",
        blocked: false,
      },
    ],
    [
      {
        label: "Interval",
        value: String(message.interval),
        bits: 32,
        description: "ELP transmission interval announced by the sender.",
        blocked: false,
      },
    ],
    [
      {
        label: ui.packet.fieldOriginatorAddress,
        value: peerNameById.get(message.sourcePeerId) ?? message.sourcePeerId,
        bits: 48,
        description: "MAC address of the node that generated this ELP packet.",
        blocked: false,
      },
    ],
    ...neighbourRows,
  ];
};

const getEventMessage = (event: SimulationEvent): SimulationMessage | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as SimulationMessage;
};
