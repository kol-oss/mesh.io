import {
  DsdvUpdateType,
  type DsdvRouteUpdateMessage,
} from "@/features/processor/types/protocols/dsdv";
import type { FieldStructure } from "@/shared/types/common/field";
import type { PeerEntity } from "@/shared/types/model/entities";
import { getNameById } from "@/shared/utils/peers";

export const DSDV_MIN_INTERVAL = 1;
export const DSDV_MIN_TIMEOUT = 1;

export const DSDV_METRIC_INFINITY = 16;
export const DSDV_SEQUENCE_INITIAL = 0;

export const DSDV_DEFAULT_CONFIGURATION = {
  incrementalUpdateInterval: 1,
  fullDumpInterval: 5,
  routeTimeout: 10,
};

const getDsdvUpdateTypeLabel = (updateType: DsdvUpdateType) => {
  return updateType === DsdvUpdateType.Incremental ? "0x02" : "0x01";
};

export const getDsdvUpdateMessageStructure = (
  message: DsdvRouteUpdateMessage,
  peers?: PeerEntity[],
): FieldStructure[][] => {
  const routeRows: FieldStructure[][] = message.entries.map((entry) => [
    {
      label: "Destination",
      value: getNameById(entry.destinationPeerId, peers),
      bits: 32,
      description: "The destination node represented by this route entry.",
      blocked: false,
    },
    {
      label: "Sequence",
      value: String(entry.sequenceNumber),
      bits: 32,
      description: "Freshness indicator used to prefer newer DSDV advertisements.",
      blocked: false,
    },
    {
      label: "Metric",
      value: String(entry.metric),
      bits: 32,
      description: "Hop distance to destination as advertised by the sender.",
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
          "Identifies DSDV update kind: 0x01 for Full Dump and 0x02 for Incremental Update.",
        blocked: false,
      },
      {
        label: "Reserved",
        value: "N/A",
        bits: 24,
        description: "Padding used to maintain 32-bit alignment in this simplified model.",
        blocked: true,
      },
    ],
    [
      {
        label: "Entry Count",
        value: String(message.entries.length),
        bits: 32,
        description: "Total number of route entries carried by this update.",
        blocked: false,
      },
    ],
    ...routeRows,
  ];
};
