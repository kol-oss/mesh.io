import type {
  DsrRouteErrorMessage,
  DsrRouteReplyMessage,
  DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import type { FieldStructure } from "@/shared/types/common/field";
import type { DsrConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import { getNameById } from "@/shared/utils/peers";

export const DSR_DEFAULT_PACKET_TTL = 50;
export const DSR_DEFAULT_HOP_LIMIT = 32;
export const DSR_MIN_ROUTE_TIMEOUT = 1;
export const DSR_MAX_REDISCOVERY_ATTEMPTS = 2;
export const DSR_MAX_SALVAGE_COUNT = 1;

// default configuration
export const DSR_DEFAULT_CONFIGURATION = {
  routeTimeout: 10,
} as DsrConfiguration;

export const getRouteRequestMessageStructure = (
  message: DsrRouteRequestMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const { routePeerIds: routeIds } = message;
  let path: FieldStructure[][] = [];

  if (routeIds.length > 0 && peers) {
    path = routeIds.map((peerId) => [
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
        value: String(message.routePeerIds.length * 4 + 6),
        bits: 8,
        description:
          "Length of option payload, calculated as (4 * n) + 6, where n is the number of path.",
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
        value: getNameById(message.targetPeerId, peers),
        bits: 32,
        description: "Requested destination address.",
        blocked: false,
      },
    ],
    ...path,
  ];
};

export const getRouteReplyMessageStructure = (
  message: DsrRouteReplyMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const { routePeerIds: routeIds } = message;
  let path: FieldStructure[][] = [];

  if (routeIds.length > 0 && peers) {
    path = routeIds.map((peerId) => [
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
    ...path,
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
        value: getNameById(message.brokenFromPeerId, peers),
        bits: 32,
        description: "Node that detected the broken link.",
        blocked: false,
      },
    ],
    [
      {
        label: "Error Destination Address",
        value: getNameById(message.destinationPeerId, peers),
        bits: 32,
        description: "Packet destination impacted by the error.",
        blocked: false,
      },
    ],
    [
      {
        label: "Type-Specific Information",
        value: getNameById(message.brokenToPeerId, peers),
        bits: 32,
        description: "Unreachable next-hop address for this failure.",
        blocked: false,
      },
    ],
  ];
};
