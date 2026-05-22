import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import { DSDV_MIN_INTERVAL, DSDV_MIN_TIMEOUT } from "@/shared/constants/protocols/dsdv";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { DsdvConfiguration, PeerConfiguration } from "@/shared/types/model/configurations";
import { getConfiguration, type PeerEntity } from "@/shared/types/model/peers";
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
    incrementalUpdateInterval = DSDV_MIN_INTERVAL,
    fullDumpInterval = DSDV_MIN_INTERVAL,
    routeTimeout = DSDV_MIN_TIMEOUT,
  } = getConfiguration(peer) as DsdvConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  return (
    <>
      <PropertyGroup>
        <NumberPropertyField
          label="Incremental Update Interval"
          icon={<Clock3 size={12} />}
          global
          valid={incrementalUpdateInterval >= DSDV_MIN_INTERVAL}
          value={incrementalUpdateInterval}
          min={DSDV_MIN_INTERVAL}
          onChange={(event) =>
            onChange(event, "incrementalUpdateInterval", DSDV_MIN_INTERVAL, true)
          }
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Full Dump Interval"
          icon={<Clock3 size={12} />}
          global
          valid={fullDumpInterval >= DSDV_MIN_INTERVAL}
          value={fullDumpInterval}
          min={DSDV_MIN_INTERVAL}
          onChange={(event) => onChange(event, "fullDumpInterval", DSDV_MIN_INTERVAL, true)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Route Timeout"
          icon={<Clock3 size={12} />}
          valid={routeTimeout >= DSDV_MIN_TIMEOUT}
          value={routeTimeout}
          min={DSDV_MIN_TIMEOUT}
          onChange={(event) => onChange(event, "routeTimeout", DSDV_MIN_TIMEOUT)}
        />
      </PropertyGroup>
    </>
  );
}
