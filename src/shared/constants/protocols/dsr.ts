import type {
  DsrPacket,
  DsrRouteErrorMessage,
  DsrRouteReplyMessage,
  DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import type { FieldStructure } from "@/shared/types/common/field";
import type { DsrConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import { getNameById } from "@/shared/utils/peers";
import type { UUID } from "@/shared/types/common/uuid.ts";

export const DSR_MIN_ROUTE_TIMEOUT = 1;
export const DSR_MAX_SALVAGE_COUNT = 1;

// default configuration
export const DSR_DEFAULT_CONFIGURATION = {
  routeTimeout: 2,
} as DsrConfiguration;

export const getDsrPacketMessageStructure = (
  message: DsrPacket,
  peerId: UUID,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const { path, salvageCount } = message;
  const segmentsLeft = path.length - path.indexOf(peerId);
  let pathRows: FieldStructure[][] = [];

  if (path.length > 0 && peers) {
    pathRows = path.map((peerId) => [
      {
        label: "Address",
        value: getNameById(peerId, peers),
        bits: 32,
        description: "Accumulated hop IP-address carried by Route Request.",
        blocked: false,
      },
    ]);
  }

  return [
    [
      {
        label: "Option Type",
        value: "0x60",
        bits: 8,
        description: "DSR Packet option type.",
        blocked: false,
      },
      {
        label: "Opt Data Len",
        value: String(path.length * 4 + 6),
        bits: 8,
        description:
          "Length of option payload, calculated as (4 * n) + 6, where n is the number of path.",
        blocked: false,
      },
      {
        label: "Flags",
        value: "N/A",
        bits: 4,
        description: "Flags used for internetwork connectivity.",
        blocked: true,
      },
      {
        label: "Salvage",
        value: `${salvageCount}`,
        bits: 4,
        description: "Count of how much salvage attempts were tried.",
        blocked: false,
      },
      {
        label: "Segments Left",
        value: String(segmentsLeft),
        bits: 8,
        description: "Count of how much hops left to reach the destination.",
        blocked: false,
      },
    ],
    ...pathRows,
  ];
};

export const getRouteRequestMessageStructure = (
  message: DsrRouteRequestMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const { path, identification, destinationId, sourceId } = message;
  let pathRows: FieldStructure[][] = [];

  if (path.length > 0 && peers) {
    pathRows = path.map((peerId) => [
      {
        label: "Address",
        value: getNameById(peerId, peers),
        bits: 32,
        description: "Accumulated hop IP-address carried by Route Request.",
        blocked: false,
      },
    ]);
  }

  return [
    [
      {
        label: "Packet Type",
        value: "0x01",
        bits: 8,
        description: "DSR Route Request option type.",
        blocked: false,
      },
      {
        label: "Opt Data Len",
        value: String(path.length * 4 + 6),
        bits: 8,
        description:
          "Length of option payload, calculated as (4 * n) + 6, where n is the number of path.",
        blocked: false,
      },
      {
        label: "Identification",
        value: String(identification),
        bits: 16,
        description: "Route Request identifier for duplicate suppression.",
        blocked: false,
      },
    ],
    [
      {
        label: "Source Address",
        value: getNameById(sourceId, peers),
        bits: 32,
        description: "Originator address (part of IPv4 headers).",
        blocked: false,
      },
      {
        label: "Destination Address",
        value: getNameById(destinationId, peers),
        bits: 32,
        description: "Destination address (part of IPv4 headers).",
        blocked: false,
      },
    ],
    ...pathRows,
  ];
};

export const getRouteReplyMessageStructure = (
  message: DsrRouteReplyMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const { path, destinationId, sourceId } = message;
  let pathRows: FieldStructure[][] = [];

  if (path.length > 0 && peers) {
    pathRows = path.map((peerId) => [
      {
        label: "Address",
        value: getNameById(peerId, peers),
        bits: 32,
        description: "Hop IP-address inside Route Reply source route.",
        blocked: false,
      },
    ]);
  }

  return [
    [
      {
        label: "Packet Type",
        value: "0x02",
        bits: 8,
        description: "DSR Route Reply option type.",
        blocked: false,
      },
      {
        label: "Opt Data Len",
        value: String(path.length * 4 + 1),
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
    [
      {
        label: "Source Address",
        value: getNameById(sourceId, peers),
        bits: 32,
        description: "Originator address (part of IPv4 headers).",
        blocked: false,
      },
      {
        label: "Destination Address",
        value: getNameById(destinationId, peers),
        bits: 32,
        description: "Destination address (part of IPv4 headers).",
        blocked: false,
      },
    ],
    ...pathRows,
  ];
};

export const getRouteErrorMessageStructure = (
  message: DsrRouteErrorMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  return [
    [
      {
        label: "Packet Type",
        value: "0x03",
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
        value: getNameById(message.errorSourceId, peers),
        bits: 32,
        description: "Node that detected the broken link.",
        blocked: false,
      },
    ],
    [
      {
        label: "Error Destination Address",
        value: getNameById(message.destinationId, peers),
        bits: 32,
        description: "Packet destination impacted by the error.",
        blocked: false,
      },
    ],
    [
      {
        label: "Type-Specific Information",
        value: getNameById(message.errorDestinationId, peers),
        bits: 32,
        description: "Unreachable next-hop address for this failure.",
        blocked: false,
      },
    ],
  ];
};
