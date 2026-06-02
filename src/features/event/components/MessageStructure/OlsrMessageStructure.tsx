import {
  type OlsrHelloMessage,
  OlsrNeighbourStatus,
  type OlsrTcMessage,
} from "@/features/processor/types/protocols/olsr";
import { type Message, MessageType } from "@/shared/types/common/messages";
import type { FieldStructure } from "@/shared/types/common/field.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";

type OlsrMessageStructureProps = {
  message: Message;
  peerNameById: Map<string, string>;
  packetStructureAria: string;
};

const getAddressesBlock = (
  addresses: UUID[],
  type: OlsrNeighbourStatus,
  peerNameById: Map<string, string>,
): FieldStructure[][] => {
  if (addresses.length === 0) {
    return [];
  }

  const neighbourRows: FieldStructure[] = addresses.map((neighbourId) => ({
    label: "Neighbor Interface Address",
    value: peerNameById.get(neighbourId),
    bits: 32,
    description: "Neighbour interface address carried in the HELLO link block.",
    blocked: false,
  }));

  return [
    [
      {
        label: "Link Code",
        value: type === OlsrNeighbourStatus.Symmetric ? "SYM" : "MPR",
        bits: 8,
        description: "Defines the modeled symmetric-link state.",
        blocked: false,
      },
      {
        label: "Reserved",
        value: "N/A",
        bits: 8,
        description: "Reserved field, transmitted as 0.",
        blocked: true,
      },
      {
        label: "Link Message Size",
        value: String(4 + 4 * addresses.length),
        bits: 16,
        description:
          "Size of the link-description block, consist of 4 bytes for header and 4 bites for each address.",
        blocked: false,
      },
    ],
    ...neighbourRows.map((row) => [row]),
  ];
};

const getOlsrHelloStructure = (
  message: OlsrHelloMessage,
  peerNameById: Map<string, string>,
): FieldStructure[][] => {
  const { neighbours, mprPeerIds: mprSet } = message;

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
    ...getAddressesBlock(neighbours, OlsrNeighbourStatus.Symmetric, peerNameById),
    ...getAddressesBlock(mprSet, OlsrNeighbourStatus.MultipointRelay, peerNameById),
  ];
};

const getOlsrTcStructureRows = (
  message: OlsrTcMessage,
  peerNameById: Map<string, string>,
): FieldStructure[][] => {
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
      ? getOlsrHelloStructure(message, peerNameById)
      : getOlsrTcStructureRows(message as OlsrTcMessage, peerNameById);

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
