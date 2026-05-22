import type {
  BatmanEchoLocationMessage,
  BatmanOriginatorMessage,
} from "../../../features/processor/types/protocols/batman";
import type { FieldStructure } from "../../types/common/field";
import type { BatmanConfiguration } from "../../types/model/configurations";
import type { PeerEntity } from "../../types/model/entities";
import { getNameById } from "../../utils/peers";

// validation
export const BATMAN_MIN_OGM_INTERVAL = 1;
export const BATMAN_MIN_ELP_INTERVAL = 1;
export const BATMAN_MIN_PURGE_TIMEOUT = 1;
export const BATMAN_MIN_DISTANCE_PENALTY = 1;
export const BATMAN_MIN_PENALTY_PERCENT = 1;

// simulation configuration
export const BATMAN_VERSION = 5;
export const BATMAN_TIME_TO_LIVE = 50;
export const BATMAN_PROTECTION_WINDOW_SIZE = 64;
export const BATMAN_OGM_HOP_PENALTY_PERCENT = 5.8;
export const BATMAN_MAX_THROUGHPUT = 2 ** 32;
export const BATMAN_WIRELESS_BASE_THROUGHPUT = 100;
export const BATMAN_WIRED_BASE_THROUGHPUT = 1000;

// default configuration
export const BATMAN_DEFAULT_CONFIGURATION = {
  penaltyDistance: 75,
  penaltyPercent: 5,
  elpInterval: BATMAN_MIN_ELP_INTERVAL,
  ogmInterval: BATMAN_MIN_OGM_INTERVAL,
  purgeTimeout: 10,
} as BatmanConfiguration;

// Echo Location Protocol message structure
export const getEchoLocationMessageStructure = (
  message: BatmanEchoLocationMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const { neighbours } = message;

  return [
    [
      {
        label: "Packet Type",
        value: "0x03",
        bits: 8,
        description: "Identifies this packet as an ELP message.",
        blocked: false,
      },
      {
        label: "Version",
        value: String(message.version),
        bits: 8,
        description: "Protocol version used by the sender.",
        blocked: false,
      },
      {
        label: "TTL",
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
        label: "Sequence Number",
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
        label: "Originator Address",
        value: getNameById(message.sourceId, peers),
        bits: 48,
        description: "MAC address of the node that generated this ELP packet.",
        blocked: false,
      },
    ],
    ...neighbours.map((neighbour) => [
      {
        label: "Neighbour Address",
        value: getNameById(neighbour, peers),
        bits: 48,
        description: "MAC address of a neighbour listed in this ELP message.",
        blocked: false,
      },
    ]),
  ];
};

export const getOriginatorMessageStructure = (
  message: BatmanOriginatorMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  return [
    [
      {
        label: "Packet Type",
        value: "0x06",
        bits: 8,
        description: "Identifies this packet as an OGM message.",
        blocked: false,
      },
      {
        label: "Version",
        value: String(message.version),
        bits: 8,
        description: "OGM protocol version field.",
        blocked: false,
      },
      {
        label: "Flags",
        value: "N/A",
        bits: 8,
        description: "Control flags for additional OGM semantics.",
        blocked: true,
      },
      {
        label: "TTL",
        value: String(message.timeToLive),
        bits: 8,
        description: "Maximum forwarding depth still allowed.",
        blocked: false,
      },
    ],
    [
      {
        label: "Sequence Number",
        value: String(message.sequence),
        bits: 32,
        description: "Sequence protection value to identify new OGMs.",
        blocked: false,
      },
    ],
    [
      {
        label: "Originator Address",
        value: getNameById(message.sourceId, peers),
        bits: 48,
        description: "MAC address of the source node that originated the route advertisement.",
        blocked: false,
      },
    ],
    [
      {
        label: "Throughput",
        value: String(message.throughput),
        bits: 32,
        description: "Current path throughput estimate carried with the OGM.",
        blocked: false,
      },
    ],
    [
      {
        label: "Sender Address",
        value: getNameById(message.senderId, peers),
        bits: 48,
        description: "MAC address of the last-hop node that forwarded this OGM.",
        blocked: false,
      },
    ],
  ];
};
