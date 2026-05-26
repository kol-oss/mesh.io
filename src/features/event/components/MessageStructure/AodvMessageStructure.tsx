import {
  type AodvHelloMessage,
  type AodvRouteErrorMessage,
  type AodvRouteReplyMessage,
  type AodvRouteRequestMessage,
} from "@/features/processor/types/protocols/aodv";
import { MessageType } from "@/shared/types/common/messages";

type PacketStructureField = {
  label: string;
  value: string;
  bits: number;
  description: string;
  blocked: boolean;
};

type AodvMessageStructureProps = {
  message:
    | AodvRouteRequestMessage
    | AodvRouteReplyMessage
    | AodvRouteErrorMessage
    | AodvHelloMessage;
  peerNameById: Map<string, string>;
  packetStructureAria: string;
};

const getAodvStructureRows = (
  message:
    | AodvRouteRequestMessage
    | AodvRouteReplyMessage
    | AodvRouteErrorMessage
    | AodvHelloMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.type === MessageType.AodvRouteRequestMessage) {
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

  if (message.type === MessageType.AodvRouteReplyMessage) {
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

  if (message.type === MessageType.AodvRouteErrorMessage) {
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
          label: "N Flag",
          value: message.noDelete ? "1" : "0",
          bits: 8,
          description: "No-delete flag from the RFC Route Error layout.",
          blocked: false,
        },
        {
          label: "Dest Count",
          value: String(message.unreachableDestinations.length),
          bits: 8,
          description: "Number of unreachable destinations reported in the message.",
          blocked: false,
        },
      ],
      ...unreachableRows,
    ];
  }

  return [
    [
      {
        label: "Packet Type",
        value: "HELLO",
        bits: 8,
        description: "HELLO messages are modeled as local AODV neighbour beacons.",
        blocked: false,
      },
      {
        label: "Destination Sequence Number",
        value: String(message.destinationSequenceNumber),
        bits: 32,
        description: "Sequence number that keeps the direct neighbour route fresh.",
        blocked: false,
      },
    ],
    [
      {
        label: "Lifetime",
        value: String(message.lifetime),
        bits: 32,
        description: "Time for which receivers should treat the neighbour route as active.",
        blocked: false,
      },
      {
        label: "Interval",
        value: String(message.interval),
        bits: 32,
        description: "HELLO emission interval advertised to neighbours.",
        blocked: false,
      },
    ],
  ];
};

export default function AodvMessageStructure({
  message,
  peerNameById,
  packetStructureAria,
}: AodvMessageStructureProps) {
  const rows = getAodvStructureRows(message, peerNameById);

  return (
    <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
      {rows.map((row, rowIndex) => (
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
                  <span className="simulation-panel__packet-tooltip-note">{"Not modeled"}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
