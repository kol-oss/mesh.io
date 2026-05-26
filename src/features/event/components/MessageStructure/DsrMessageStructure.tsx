import {
  type DsrRouteErrorMessage,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import { MessageType } from "@/shared/types/common/messages";

type PacketStructureField = {
  label: string;
  value: string;
  bits: number;
  description: string;
  blocked: boolean;
};

type DsrMessageStructureProps = {
  message: DsrRouteRequestMessage | DsrRouteReplyMessage | DsrRouteErrorMessage;
  peerNameById: Map<string, string>;
  packetStructureAria: string;
};

const getDsrStructureRows = (
  message: DsrRouteRequestMessage | DsrRouteReplyMessage | DsrRouteErrorMessage,
  peerNameById: Map<string, string>,
): PacketStructureField[][] => {
  if (message.type === MessageType.DsrRouteRequestMessage) {
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

  if (message.type === MessageType.DsrRouteReplyMessage) {
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
};

export default function DsrMessageStructure({
  message,
  peerNameById,
  packetStructureAria,
}: DsrMessageStructureProps) {
  const rows = getDsrStructureRows(message, peerNameById);

  return (
    <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
      {rows.map((row, rowIndex) => (
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
