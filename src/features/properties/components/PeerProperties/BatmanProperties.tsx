import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import {
  BATMAN_MIN_DISTANCE_PENALTY,
  BATMAN_MIN_ELP_INTERVAL,
  BATMAN_MIN_OGM_INTERVAL,
  BATMAN_MIN_PENALTY_PERCENT,
  BATMAN_MIN_PURGE_TIMEOUT,
} from "@/shared/constants/protocols/batman";
import { BatmanConfigurationSchema } from "@/shared/schemas/configuration/BatmanConfigurationSchema";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { BatmanConfiguration, PeerConfiguration } from "@/shared/types/model/configurations";
import { type PeerEntity } from "@/shared/types/model/peers";
import { getOnConfigurationChange } from "@/shared/utils/properties";
import { Clock3, Percent, Ruler } from "lucide-react";

type BatmanPropertiesProps = {
  peer: PeerEntity;
  updateConfiguration: (changes: Partial<PeerConfiguration>) => void;
  updateConfigurationByProtocol: (
    protocol: RoutingProtocol,
    changes: Partial<PeerConfiguration>,
  ) => void;
};

export default function BatmanProperties({
  peer,
  updateConfiguration,
  updateConfigurationByProtocol,
}: BatmanPropertiesProps) {
  const {
    ogmInterval = BATMAN_MIN_OGM_INTERVAL,
    elpInterval = BATMAN_MIN_ELP_INTERVAL,
    purgeTimeout = BATMAN_MIN_PURGE_TIMEOUT,
    penaltyDistance = BATMAN_MIN_DISTANCE_PENALTY,
    penaltyPercent = BATMAN_MIN_PENALTY_PERCENT,
  } = peer.configuration as BatmanConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  const validation = BatmanConfigurationSchema.safeParse(peer.configuration);
  const errors = validation.success ? null : validation.error.flatten().fieldErrors;

  return (
    <>
      <PropertyGroup label="Distance Penalty" global>
        <NumberPropertyField
          icon={<Ruler size={12} />}
          valid={!errors?.penaltyDistance}
          value={penaltyDistance}
          min={BATMAN_MIN_DISTANCE_PENALTY}
          onChange={(event) =>
            onChange(event, "penaltyDistance", BATMAN_MIN_DISTANCE_PENALTY, true)
          }
        />
        <NumberPropertyField
          icon={<Percent size={12} />}
          valid={!errors?.penaltyPercent}
          value={penaltyPercent}
          min={BATMAN_MIN_PENALTY_PERCENT}
          onChange={(event) => onChange(event, "penaltyPercent", BATMAN_MIN_PENALTY_PERCENT, true)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="ELP Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.elpInterval}
          value={elpInterval}
          min={BATMAN_MIN_ELP_INTERVAL}
          onChange={(event) => onChange(event, "elpInterval", BATMAN_MIN_ELP_INTERVAL)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="OGM Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.ogmInterval}
          value={ogmInterval}
          min={BATMAN_MIN_OGM_INTERVAL}
          onChange={(event) => onChange(event, "ogmInterval", BATMAN_MIN_OGM_INTERVAL)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Purge Timeout"
          icon={<Clock3 size={12} />}
          valid={!errors?.purgeTimeout}
          value={purgeTimeout}
          min={BATMAN_MIN_PURGE_TIMEOUT}
          onChange={(event) => onChange(event, "purgeTimeout", BATMAN_MIN_PURGE_TIMEOUT)}
        />
      </PropertyGroup>
    </>
  );
}
