import {
  BATMAN_MIN_DISTANCE_PENALTY,
  BATMAN_MIN_ELP_INTERVAL,
  BATMAN_MIN_OGM_INTERVAL,
  BATMAN_MIN_PENALTY_PERCENT,
  BATMAN_MIN_PURGE_TIMEOUT,
} from "@/shared/constants/batman";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { BatmanConfiguration } from "@/shared/types/model/configurations";
import { getConfiguration, type PeerEntity } from "@/shared/types/model/peers";
import { parsePositiveNumberValue } from "@/shared/utils/properties";
import { Clock3, Percent, Ruler } from "lucide-react";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";

const ROUTING_PROTOCOL = RoutingProtocol.BATMAN;

type BatmanPropertiesProps = {
  peer: PeerEntity;
  updatePeerById: (id: UUID, changes: Partial<BatmanConfiguration>) => void;
  updatePeersByProtocol: (protocol: RoutingProtocol, changes: Partial<BatmanConfiguration>) => void;
};

export default function BatmanProperties({
  peer,
  updatePeerById,
  updatePeersByProtocol,
}: BatmanPropertiesProps) {
  const configuration = getConfiguration(peer) as BatmanConfiguration;
  const peerId = peer.id;

  const isOgmMissing = (configuration?.ogmInterval ?? 0) < BATMAN_MIN_OGM_INTERVAL;
  const isElpMissing = (configuration?.elpInterval ?? 0) < BATMAN_MIN_ELP_INTERVAL;
  const isPurgeMissing = (configuration?.purgeTimeout ?? 0) < BATMAN_MIN_PURGE_TIMEOUT;
  const isPenaltyDistanceMissing =
    (configuration?.distancePenaltyDistance ?? 0) < BATMAN_MIN_DISTANCE_PENALTY;
  const isPenaltyPercentMissing =
    (configuration?.distancePenaltyPercent ?? 0) < BATMAN_MIN_PENALTY_PERCENT;

  return (
    <>
      <PropertyGroup label="Distance Penalty" global>
        <NumberPropertyField
          icon={<Ruler size={12} />}
          valid={!isPenaltyDistanceMissing}
          value={configuration?.distancePenaltyDistance ?? BATMAN_MIN_DISTANCE_PENALTY}
          min={BATMAN_MIN_DISTANCE_PENALTY}
          onChange={(event) =>
            updatePeersByProtocol(ROUTING_PROTOCOL, {
              distancePenaltyDistance: parsePositiveNumberValue(
                event.target.value,
                configuration?.distancePenaltyDistance ?? BATMAN_MIN_DISTANCE_PENALTY,
              ),
            })
          }
        />
        <NumberPropertyField
          icon={<Percent size={12} />}
          valid={!isPenaltyPercentMissing}
          value={configuration?.distancePenaltyPercent ?? BATMAN_MIN_PENALTY_PERCENT}
          min={BATMAN_MIN_PENALTY_PERCENT}
          onChange={(event) =>
            updatePeersByProtocol(ROUTING_PROTOCOL, {
              distancePenaltyPercent: parsePositiveNumberValue(
                event.target.value,
                configuration?.distancePenaltyPercent ?? BATMAN_MIN_PENALTY_PERCENT,
              ),
            })
          }
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="ELP Interval"
          icon={<Clock3 size={12} />}
          valid={!isElpMissing}
          value={configuration?.elpInterval ?? BATMAN_MIN_ELP_INTERVAL}
          min={BATMAN_MIN_ELP_INTERVAL}
          onChange={(event) =>
            updatePeerById(peerId, {
              elpInterval: parsePositiveNumberValue(
                event.target.value,
                configuration?.elpInterval ?? BATMAN_MIN_ELP_INTERVAL,
              ),
            })
          }
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="OGM Interval"
          icon={<Clock3 size={12} />}
          valid={!isOgmMissing}
          value={configuration?.ogmInterval ?? BATMAN_MIN_OGM_INTERVAL}
          min={BATMAN_MIN_OGM_INTERVAL}
          onChange={(event) =>
            updatePeerById(peerId, {
              ogmInterval: parsePositiveNumberValue(
                event.target.value,
                configuration?.ogmInterval ?? BATMAN_MIN_OGM_INTERVAL,
              ),
            })
          }
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Purge Timeout"
          icon={<Clock3 size={12} />}
          valid={!isPurgeMissing}
          value={configuration?.purgeTimeout ?? BATMAN_MIN_PURGE_TIMEOUT}
          min={BATMAN_MIN_PURGE_TIMEOUT}
          onChange={(event) =>
            updatePeerById(peerId, {
              purgeTimeout: parsePositiveNumberValue(
                event.target.value,
                configuration?.purgeTimeout ?? BATMAN_MIN_PURGE_TIMEOUT,
              ),
            })
          }
        />
      </PropertyGroup>
    </>
  );
}
