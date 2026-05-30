import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import { DSDV_MIN_INTERVAL, DSDV_MIN_TIMEOUT } from "@/shared/constants/protocols/dsdv";
import { DsdvConfigurationSchema } from "@/shared/schemas/configuration/DsdvConfigurationSchema";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { DsdvConfiguration, PeerConfiguration } from "@/shared/types/model/configurations";
import { type PeerEntity } from "@/shared/types/model/peers";
import { getOnConfigurationChange } from "@/shared/utils/properties";
import { Clock3 } from "lucide-react";

type DsdvPropertiesProps = {
  peer: PeerEntity;
  updateConfiguration: (changes: Partial<PeerConfiguration>) => void;
  updateConfigurationByProtocol: (
    protocol: RoutingProtocol,
    changes: Partial<PeerConfiguration>,
  ) => void;
};

export default function DsdvProperties({
  peer,
  updateConfiguration,
  updateConfigurationByProtocol,
}: DsdvPropertiesProps) {
  const {
    refreshInterval = DSDV_MIN_INTERVAL,
    dumpInterval = DSDV_MIN_INTERVAL,
    routeTimeout = DSDV_MIN_TIMEOUT,
  } = peer.configuration as DsdvConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  const validation = DsdvConfigurationSchema.safeParse(peer.configuration);
  const errors = validation.success ? null : validation.error.flatten().fieldErrors;

  return (
    <>
      <PropertyGroup>
        <NumberPropertyField
          label="Full Dump Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.dumpInterval}
          value={dumpInterval}
          min={DSDV_MIN_INTERVAL}
          global
          onChange={(event) => onChange(event, "dumpInterval", DSDV_MIN_INTERVAL, true)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Incremental Update Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.refreshInterval}
          value={refreshInterval}
          min={DSDV_MIN_INTERVAL}
          onChange={(event) => onChange(event, "refreshInterval", DSDV_MIN_INTERVAL)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Route Timeout"
          icon={<Clock3 size={12} />}
          valid={!errors?.routeTimeout}
          value={routeTimeout}
          min={DSDV_MIN_TIMEOUT}
          onChange={(event) => onChange(event, "routeTimeout", DSDV_MIN_TIMEOUT)}
        />
      </PropertyGroup>
    </>
  );
}
