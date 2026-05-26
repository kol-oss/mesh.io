import {
  type OlsrHelloMessage,
  type OlsrTcMessage,
} from "@/features/processor/types/protocols/olsr";
import { MessageType } from "@/shared/types/common/messages";

type PacketStructureField = {
  label: string;
  value: string;
  bits: number;
  description: string;
  blocked: boolean;
};

type OlsrMessageStructureProps = {
  message: OlsrHelloMessage | OlsrTcMessage;
  peerNameById: Map<string, string>;
  packetStructureAria: string;
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

export default function OlsrMessageStructure({
  message,
  peerNameById,
  packetStructureAria,
}: OlsrMessageStructureProps) {
  const rows =
    message.type === MessageType.OlsrHelloMessage
      ? getOlsrHelloStructureRows(message, peerNameById)
      : getOlsrTcStructureRows(message, peerNameById);

  return (
    <div className="simulation-panel__packet-structure" aria-label={packetStructureAria}>
      {rows.map((row, rowIndex) => (
        <div
          className="simulation-panel__packet-row"
          key={`packet-row-olsr-${message.type}-${rowIndex}`}
        >
          {row.map((field) => (
            <div
              key={`olsr-${message.type}-${rowIndex}-${field.label}`}
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
