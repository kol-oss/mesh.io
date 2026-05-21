import { RoutingProtocol } from "@/shared/types/common/protocols";
import { DsdvUpdateType } from "@/shared/types/processor/dsdv";
import { type Event } from "@/shared/types/processor/events";
import { MessageType, type Message } from "@/shared/types/processor/messages";
import { type OlsrHelloMessage, type OlsrTcMessage } from "@/shared/types/processor/olsr";
import { type StepResult } from "@/shared/types/processor/simulation";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import BatmanMessageStructure from "./BatmanMessageStructure";

type MessageStructureProps = {
  isOpen: boolean;
  currentEvent: Event | null;
  currentStepResult: StepResult | null;
  onClose: () => void;
};

type PacketStructureField = {
  label: string;
  value: string;
  bits: number;
  description: string;
  blocked: boolean;
};

export default function MessageStructure({
  isOpen,
  currentEvent,
  currentStepResult,
  onClose,
}: MessageStructureProps) {
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

  const handlePanelPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
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

  const eventMessage = getEventMessage(currentEvent);
  const peerNameById = new Map(
    currentStepResult.snapshot.peers.map((peer) => [peer.id, peer.name]),
  );
  const inspectorTitle = getPacketInspectorTitle(eventMessage);
  const packetStructureAria = getPacketInspectorStructureAria(eventMessage);
  const readMorePath = getPacketReadMorePath(eventMessage);

  const { protocol } = currentEvent;
  return (
    <aside
      className={`simulation-panel simulation-panel--inspector${isDragging ? " simulation-panel--dragging" : ""}`}
      aria-label={"Packet structure inspector"}
      onPointerDown={handlePanelPointerDown}
      style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
    >
      <header className="simulation-panel__header" onPointerDown={handleHeaderPointerDown}>
        <h2 className="simulation-panel__title">{inspectorTitle}</h2>
        <button
          className="simulation-panel__close-button"
          type="button"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={"Close packet structure"}
        >
          <X size={14} />
        </button>
      </header>
      <section className="simulation-panel__section">
        {protocol == RoutingProtocol.BATMAN && (
          <BatmanMessageStructure
            message={eventMessage!}
            peers={currentStepResult.snapshot.peers}
          />
        )}

        {eventMessage?.kind === MessageType.DsdvRouteUpdateMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
            {getDsdvStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-dsdv-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`dsdv-${rowIndex}-${field.label}`}
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
                        {field.bits} {"bits"}
                      </span>
                      {field.blocked ? (
                        <span className="simulation-panel__packet-tooltip-note">
                          {"Not modeled"}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : eventMessage?.kind === MessageType.AodvRouteRequestMessage ||
          eventMessage?.kind === MessageType.AodvRouteReplyMessage ||
          eventMessage?.kind === MessageType.AodvRouteErrorMessage ||
          eventMessage?.kind === MessageType.AodvHelloMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
            {getAodvStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-aodv-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`aodv-${rowIndex}-${field.label}`}
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
                        {field.bits} {"bits"}
                      </span>
                      {field.blocked ? (
                        <span className="simulation-panel__packet-tooltip-note">
                          {"Not modeled"}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : eventMessage?.kind === MessageType.OlsrHelloMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
            {getOlsrHelloStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div
                className="simulation-panel__packet-row"
                key={`packet-row-olsr-hello-${rowIndex}`}
              >
                {row.map((field) => (
                  <div
                    key={`olsr-hello-${rowIndex}-${field.label}`}
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
                        {field.bits} {"bits"}
                      </span>
                      {field.blocked ? (
                        <span className="simulation-panel__packet-tooltip-note">
                          {"Not modeled"}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : eventMessage?.kind === MessageType.OlsrTcMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
            {getOlsrTcStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-olsr-tc-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`olsr-tc-${rowIndex}-${field.label}`}
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
                        {field.bits} {"bits"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : eventMessage?.kind === MessageType.DsrRouteRequestMessage ||
          eventMessage?.kind === MessageType.DsrRouteReplyMessage ||
          eventMessage?.kind === MessageType.DsrRouteErrorMessage ? (
          <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
            {getDsrStructureRows(eventMessage, peerNameById).map((row, rowIndex) => (
              <div className="simulation-panel__packet-row" key={`packet-row-dsr-${rowIndex}`}>
                {row.map((field) => (
                  <div
                    key={`dsr-${rowIndex}-${field.label}`}
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
                        {field.bits} {"bits"}
                      </span>
                      {field.blocked ? (
                        <span className="simulation-panel__packet-tooltip-note">
                          {"Not modeled"}
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
            {"Packet structure is not available for this event."}
          </p>
        )}
      </section>
      <footer className="simulation-panel__footer">
        <a
          className="simulation-panel__read-more"
          href={readMorePath}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} />
          {"Read more"}
        </a>
      </footer>
    </aside>
  );
}

const getPacketInspectorTitle = (message: Message | null) => {
  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return "Echo Location Message (ELP)";
  }

  if (message?.kind === MessageType.DsdvRouteUpdateMessage) {
    return "DSDV Update Message";
  }

  if (message?.kind === MessageType.AodvRouteRequestMessage) {
    return "AODV Route Request (RREQ)";
  }

  if (message?.kind === MessageType.AodvRouteReplyMessage) {
    return "AODV Route Reply (RREP)";
  }

  if (message?.kind === MessageType.AodvRouteErrorMessage) {
    return "AODV Route Error (RERR)";
  }

  if (message?.kind === MessageType.AodvHelloMessage) {
    return "AODV HELLO Message";
  }

  if (message?.kind === MessageType.OlsrHelloMessage) {
    return "OLSR HELLO Message";
  }

  if (message?.kind === MessageType.OlsrTcMessage) {
    return "OLSR TC Message";
  }

  if (message?.kind === MessageType.DsrRouteRequestMessage) {
    return "DSR Route Request (RREQ)";
  }

  if (message?.kind === MessageType.DsrRouteReplyMessage) {
    return "DSR Route Reply (RREP)";
  }

  if (message?.kind === MessageType.DsrRouteErrorMessage) {
    return "DSR Route Error (RERR)";
  }

  return "Originator Message version 2 (OGMv2)";
};

const getPacketInspectorStructureAria = (message: Message | null) => {
  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return "Echo Location Message structure";
  }

  if (message?.kind === MessageType.DsdvRouteUpdateMessage) {
    return "DSDV route update structure";
  }

  if (message?.kind === MessageType.AodvRouteRequestMessage) {
    return "AODV Route Request structure";
  }

  if (message?.kind === MessageType.AodvRouteReplyMessage) {
    return "AODV Route Reply structure";
  }

  if (message?.kind === MessageType.AodvRouteErrorMessage) {
    return "AODV Route Error structure";
  }

  if (message?.kind === MessageType.AodvHelloMessage) {
    return "AODV HELLO structure";
  }

  if (message?.kind === MessageType.OlsrHelloMessage) {
    return "OLSR HELLO message structure";
  }

  if (message?.kind === MessageType.OlsrTcMessage) {
    return "OLSR TC message structure";
  }

  if (message?.kind === MessageType.DsrRouteRequestMessage) {
    return "DSR Route Request message structure";
  }

  if (message?.kind === MessageType.DsrRouteReplyMessage) {
    return "DSR Route Reply message structure";
  }

  if (message?.kind === MessageType.DsrRouteErrorMessage) {
    return "DSR Route Error message structure";
  }

  return "Originator Message version 2 structure";
};

const getPacketReadMorePath = (message: Message | null) => {
  if (message?.kind === MessageType.BatmanEchoLocationMessage) {
    return "/docs/batman#echo-location-protocol";
  }

  if (message?.kind === MessageType.BatmanOriginatorMessage) {
    return "/docs/batman#originator-message";
  }

  if (message?.kind === MessageType.DsdvRouteUpdateMessage) {
    return "/docs/dsdv#full-and-incremental-updates";
  }

  if (message?.kind === MessageType.AodvRouteRequestMessage) {
    return "/docs/aodv#route-discovery";
  }

  if (message?.kind === MessageType.AodvRouteReplyMessage) {
    return "/docs/aodv#route-discovery";
  }

  if (message?.kind === MessageType.AodvRouteErrorMessage) {
    return "/docs/aodv#route-maintenance";
  }

  if (message?.kind === MessageType.AodvHelloMessage) {
    return "/docs/aodv#route-maintenance";
  }

  if (message?.kind === MessageType.OlsrHelloMessage) {
    return "/docs/olsr#neighbor-sensing";
  }

  if (message?.kind === MessageType.OlsrTcMessage) {
    return "/docs/olsr#topology-discovery";
  }

  if (message?.kind === MessageType.DsrRouteRequestMessage) {
    return "/docs/dsr#route-discovery";
  }

  if (message?.kind === MessageType.DsrRouteReplyMessage) {
    return "/docs/dsr#route-discovery";
  }

  if (message?.kind === MessageType.DsrRouteErrorMessage) {
    return "/docs/dsr#route-maintenance";
  }

  return "/docs/batman#what-you-need-to-know";
};

const getDsrStructureRows = (
  message: Message,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.kind === MessageType.DsrRouteRequestMessage) {
    const hopRows =
      message.routePeerIds.length > 0
        ? message.routePeerIds.map((peerId) => [
            {
              label: "Address [1...n]",
              value: peerNameById.get(peerId) ?? peerId,
              bits: 32,
              description: "Accumulated hop address carried by Route Request.",
              blocked: false,
            },
          ])
        : [];

    return [
      [
        {
          label: "Packet Type",
          value: "RREQ",
          bits: 8,
          description: "DSR Route Request option type.",
          blocked: false,
        },
        {
          label: "Opt Data Len",
          value: String(message.routePeerIds.length * 4 + 6),
          bits: 8,
          description: "Length of Route Request option payload.",
          blocked: false,
        },
        {
          label: "Identification",
          value: String(message.requestId),
          bits: 16,
          description: "Route Request identifier for duplicate suppression.",
          blocked: false,
        },
      ],
      [
        {
          label: "Target Address",
          value: peerNameById.get(message.targetPeerId) ?? message.targetPeerId,
          bits: 32,
          description: "Requested destination address.",
          blocked: false,
        },
      ],
      ...hopRows,
    ];
  }

  if (message.kind === MessageType.DsrRouteReplyMessage) {
    const pathRows = message.routePeerIds.map((peerId) => [
      {
        label: "Address [1...n]",
        value: peerNameById.get(peerId) ?? peerId,
        bits: 32,
        description: "Hop address inside Route Reply source route.",
        blocked: false,
      },
    ]);

    return [
      [
        {
          label: "Packet Type",
          value: "RREP",
          bits: 8,
          description: "DSR Route Reply option type.",
          blocked: false,
        },
        {
          label: "Opt Data Len",
          value: String(message.routePeerIds.length * 4 + 1),
          bits: 8,
          description: "Length of Route Reply option payload.",
          blocked: false,
        },
        {
          label: "Flags",
          value: "0",
          bits: 8,
          description: "Route Reply flags field.",
          blocked: false,
        },
      ],
      ...pathRows,
    ];
  }

  if (message.kind === MessageType.DsrRouteErrorMessage) {
    return [
      [
        {
          label: "Packet Type",
          value: "RERR",
          bits: 8,
          description: "DSR Route Error option type.",
          blocked: false,
        },
        {
          label: "Opt Data Len",
          value: "12",
          bits: 8,
          description: "Length of Route Error option payload.",
          blocked: false,
        },
        {
          label: "Error Type",
          value: "NODE_UNREACHABLE",
          bits: 8,
          description: "Error classification describing link failure.",
          blocked: false,
        },
        {
          label: "Salvage",
          value: String(message.salvageCount),
          bits: 8,
          description: "Number of packet salvaging attempts already used.",
          blocked: false,
        },
      ],
      [
        {
          label: "Error Source Address",
          value: peerNameById.get(message.brokenFromPeerId) ?? message.brokenFromPeerId,
          bits: 32,
          description: "Node that detected the broken link.",
          blocked: false,
        },
      ],
      [
        {
          label: "Error Destination Address",
          value: peerNameById.get(message.destinationPeerId) ?? message.destinationPeerId,
          bits: 32,
          description: "Packet destination impacted by the error.",
          blocked: false,
        },
      ],
      [
        {
          label: "Type-Specific Information",
          value: peerNameById.get(message.brokenToPeerId) ?? message.brokenToPeerId,
          bits: 32,
          description: "Unreachable next-hop address for this failure.",
          blocked: false,
        },
      ],
    ];
  }

  return [];
};

const getAodvStructureRows = (
  message: Message,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.kind === MessageType.AodvRouteRequestMessage) {
    return [
      [
        {
          label: "Packet Type",
          value: "RREQ",
          bits: 8,
          description: "Identifies this control packet as an AODV Route Request.",
          blocked: false,
        },
        {
          label: "Flags",
          value: "J/R/G/D/U",
          bits: 16,
          description:
            "Join, Repair, Gratuitous RREP, Destination-only, and Unknown-sequence flags.",
          blocked: true,
        },
        {
          label: "Hop Count",
          value: String(message.hopCount),
          bits: 8,
          description: "Hop count from the originator to the current forwarding node.",
          blocked: false,
        },
      ],
      [
        {
          label: "RREQ ID",
          value: String(message.requestId),
          bits: 32,
          description: "Identifier used to suppress duplicate RREQ processing.",
          blocked: false,
        },
      ],
      [
        {
          label: "Destination",
          value: peerNameById.get(message.destinationPeerId) ?? message.destinationPeerId,
          bits: 32,
          description: "Destination for which a route is being requested.",
          blocked: false,
        },
      ],
      [
        {
          label: "Destination Sequence Number",
          value:
            message.destinationSequenceNumber === null
              ? "N/A"
              : String(message.destinationSequenceNumber),
          bits: 32,
          description: "Last known destination sequence number carried by the requester.",
          blocked: message.destinationSequenceNumber === null,
        },
      ],
      [
        {
          label: "Originator Address",
          value: peerNameById.get(message.sourcePeerId) ?? message.sourcePeerId,
          bits: 32,
          description: "Originator of the route discovery.",
          blocked: false,
        },
      ],
      [
        {
          label: "Sequence Number",
          value: String(message.originatorSequenceNumber),
          bits: 32,
          description: "Current originator sequence number used to create the reverse route.",
          blocked: false,
        },
      ],
    ];
  }

  if (message.kind === MessageType.AodvRouteReplyMessage) {
    return [
      [
        {
          label: "Packet Type",
          value: "RREP",
          bits: 8,
          description: "Identifies this control packet as an AODV Route Reply.",
          blocked: false,
        },
        {
          label: "Prefix Size",
          value: "0",
          bits: 16,
          description: "Subnet prefix size field from the RFC layout.",
          blocked: true,
        },
        {
          label: "Hop Count",
          value: String(message.hopCount),
          bits: 8,
          description: "Current distance in hops from the replying node to the destination.",
          blocked: false,
        },
      ],
      [
        {
          label: "Destination",
          value: peerNameById.get(message.destinationPeerId) ?? message.destinationPeerId,
          bits: 32,
          description: "Destination for which the route is being supplied.",
          blocked: false,
        },
      ],
      [
        {
          label: "Destination Sequence Number",
          value: String(message.destinationSequenceNumber),
          bits: 32,
          description: "Fresh destination sequence number associated with the route.",
          blocked: false,
        },
      ],
      [
        {
          label: "Originator Address",
          value: peerNameById.get(message.originatorPeerId) ?? message.originatorPeerId,
          bits: 32,
          description: "Originator that started the corresponding route discovery.",
          blocked: false,
        },
      ],
      [
        {
          label: "Lifetime",
          value: String(message.lifetime),
          bits: 32,
          description: "Amount of time the learned route may remain active.",
          blocked: false,
        },
      ],
    ];
  }

  if (message.kind === MessageType.AodvRouteErrorMessage) {
    const unreachableRows = message.unreachableDestinations.flatMap((entry) => [
      [
        {
          label: "Destination",
          value: peerNameById.get(entry.destinationPeerId) ?? entry.destinationPeerId,
          bits: 32,
          description: "Destination that became unreachable after a link break.",
          blocked: false,
        },
      ],
      [
        {
          label: "Destination Sequence Number",
          value: String(entry.sequenceNumber),
          bits: 32,
          description: "Sequence number paired with the unreachable destination.",
          blocked: false,
        },
      ],
    ]);

    return [
      [
        {
          label: "Packet Type",
          value: "RERR",
          bits: 8,
          description: "Identifies this control packet as an AODV Route Error.",
          blocked: false,
        },
        {
          label: "Flags",
          value: message.noDelete ? "N" : "0",
          bits: 16,
          description: "No-delete flag and reserved bits in the RERR header.",
          blocked: false,
        },
        {
          label: "Dest Count",
          value: String(message.unreachableDestinations.length),
          bits: 8,
          description: "Number of unreachable destinations encoded in this error.",
          blocked: false,
        },
      ],
      ...unreachableRows,
    ];
  }

  if (message.kind === MessageType.AodvHelloMessage) {
    return [
      [
        {
          label: "Packet Type",
          value: "HELLO",
          bits: 8,
          description: "Modeled as a local-broadcast AODV HELLO message.",
          blocked: false,
        },
        {
          label: "TTL",
          value: "1",
          bits: 8,
          description: "HELLO messages are transmitted with TTL = 1.",
          blocked: false,
        },
        {
          label: "Interval",
          value: String(message.interval),
          bits: 16,
          description: "Advertised HELLO interval for neighbour connectivity checks.",
          blocked: false,
        },
      ],
      [
        {
          label: "Originator Address",
          value: peerNameById.get(message.sourcePeerId) ?? message.sourcePeerId,
          bits: 32,
          description: "Neighbour announcing that it remains locally reachable.",
          blocked: false,
        },
      ],
      [
        {
          label: "Destination Sequence Number",
          value: String(message.destinationSequenceNumber),
          bits: 32,
          description: "Latest destination sequence number advertised by the neighbour.",
          blocked: false,
        },
      ],
      [
        {
          label: "Lifetime",
          value: String(message.lifetime),
          bits: 32,
          description: "How long the neighbour route should remain valid after this HELLO.",
          blocked: false,
        },
      ],
    ];
  }

  return [];
};

const getOlsrHelloStructureRows = (
  message: OlsrHelloMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  const neighbourRows =
    message.neighbours.length > 0
      ? message.neighbours.flatMap((peerId) => [
          [
            {
              label: "Link Code",
              value: message.mprPeerIds.includes(peerId) ? "SYM/MPR" : "SYM",
              bits: 8,
              description:
                "Defines the modeled symmetric-link state and whether the neighbour was selected as an MPR.",
              blocked: false,
            },
            {
              label: "Reserved",
              value: "N/A",
              bits: 8,
              description: "Reserved field, transmitted as 0 in the RFC layout.",
              blocked: true,
            },
            {
              label: "Link Message Size",
              value: "N/A",
              bits: 16,
              description: "Size of the HELLO link-description block in the RFC layout.",
              blocked: true,
            },
          ],
          [
            {
              label: "Neighbor Interface Address",
              value: peerNameById.get(peerId) ?? peerId,
              bits: 32,
              description: "Neighbour interface address carried in the HELLO link block.",
              blocked: false,
            },
          ],
        ])
      : [
          [
            {
              label: "Link Code",
              value: "N/A",
              bits: 8,
              description: "No neighbour interface addresses are advertised in this HELLO.",
              blocked: true,
            },
            {
              label: "Reserved",
              value: "N/A",
              bits: 8,
              description: "Reserved field, transmitted as 0 in the RFC layout.",
              blocked: true,
            },
            {
              label: "Link Message Size",
              value: "N/A",
              bits: 16,
              description: "Size of the HELLO link-description block in the RFC layout.",
              blocked: true,
            },
          ],
          [
            {
              label: "Neighbor Interface Address",
              value: "N/A",
              bits: 32,
              description: "No neighbour interface addresses are advertised in this HELLO.",
              blocked: true,
            },
          ],
        ];

  return [
    [
      {
        label: "Reserved",
        value: "N/A",
        bits: 16,
        description: "Reserved field for future extensions, transmitted as 0.",
        blocked: true,
      },
      {
        label: "Htime",
        value: String(message.interval),
        bits: 8,
        description: "Emission interval of the HELLO message.",
        blocked: false,
      },
      {
        label: "Willingness",
        value: "N/A",
        bits: 8,
        description:
          "Node willingness to forward traffic for others. This simulation keeps it fixed and does not model the field explicitly.",
        blocked: true,
      },
    ],
    ...neighbourRows,
  ];
};

const getOlsrTcStructureRows = (
  message: OlsrTcMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  const advertisedRows =
    message.advertisedNeighbours.length > 0
      ? message.advertisedNeighbours.map((peerId) => [
          {
            label: "Advertised Neighbor Main Address",
            value: peerNameById.get(peerId) ?? peerId,
            bits: 32,
            description: "Address of a node that selected the sender as an MPR.",
            blocked: false,
          },
        ])
      : [
          [
            {
              label: "Advertised Neighbor Main Address",
              value: "N/A",
              bits: 32,
              description: "No MPR selectors are advertised in this TC message.",
              blocked: true,
            },
          ],
        ];

  return [
    [
      {
        label: "ANSN",
        value: String(message.ansn),
        bits: 16,
        description: "Advertised Neighbour Sequence Number used for freshness checks.",
        blocked: false,
      },
      {
        label: "Reserved",
        value: "N/A",
        bits: 16,
        description: "Reserved field, transmitted as 0.",
        blocked: true,
      },
    ],
    ...advertisedRows,
  ];
};

const getDsdvUpdateTypeLabel = (updateType: DsdvUpdateType) => {
  return updateType === DsdvUpdateType.Incremental ? "0x02" : "0x01";
};

const getDsdvStructureRows = (
  message: Message,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.kind !== MessageType.DsdvRouteUpdateMessage) {
    return [];
  }

  const routeRows: PacketStructureField[][] = message.entries.map((entry) => [
    {
      label: "Destination",
      value: peerNameById.get(entry.destinationPeerId) ?? entry.destinationPeerId,
      bits: 32,
      description: "The IP address of the destination node for this route entry.",
      blocked: false,
    },
    {
      label: "Sequence Number",
      value: String(entry.sequenceNumber),
      bits: 32,
      description: "The latest sequence number received for this destination.",
      blocked: false,
    },
    {
      label: "Metric",
      value: String(entry.metric),
      bits: 32,
      description: "The number of hops to reach the destination.",
      blocked: false,
    },
  ]);

  return [
    [
      {
        label: "Packet Type",
        value: getDsdvUpdateTypeLabel(message.updateType),
        bits: 8,
        description:
          "Identifies the type of DSDV message: 0x01 for Full Dump; 0x02 for Incremental Update.",
        blocked: false,
      },
      {
        label: "Reserved",
        value: "N/A",
        bits: 24,
        description: "Padding to maintain 32-bit alignment.",
        blocked: true,
      },
    ],
    [
      {
        label: "Entry Count",
        value: String(message.entries.length),
        bits: 32,
        description: "The number of route entries contained in this packet.",
        blocked: false,
      },
    ],
    ...routeRows,
  ];
};

const getEventMessage = (event: Event): Message | null => {
  if (!("message" in event.details)) {
    return null;
  }

  return event.details.message as Message;
};
