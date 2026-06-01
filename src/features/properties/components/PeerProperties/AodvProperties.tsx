import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import { AODV_MIN_HELLO_INTERVAL, AODV_MIN_ROUTE_TIMEOUT } from "@/shared/constants/protocols/aodv";
import { AodvConfigurationSchema } from "@/shared/schemas/configuration/AodvConfigurationSchema";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { AodvConfiguration, PeerConfiguration } from "@/shared/types/model/configurations";
import { type PeerEntity } from "@/shared/types/model/peers";
import { getOnConfigurationChange } from "@/shared/utils/properties";
import { Clock3 } from "lucide-react";

type AodvPropertiesProps = {
  peer: PeerEntity;
  updateConfiguration: (changes: Partial<PeerConfiguration>) => void;
  updateConfigurationByProtocol: (
    protocol: RoutingProtocol,
    changes: Partial<PeerConfiguration>,
  ) => void;
  disabled?: boolean;
};

export default function AodvProperties({
  peer,
  updateConfiguration,
  updateConfigurationByProtocol,
  disabled = false,
}: AodvPropertiesProps) {
  const { helloInterval = AODV_MIN_HELLO_INTERVAL, routeTimeout = AODV_MIN_ROUTE_TIMEOUT } =
    peer.configuration as AodvConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  const validation = AodvConfigurationSchema.safeParse(peer.configuration);
  const errors = validation.success ? null : validation.error.flatten().fieldErrors;

  return (
    <>
      <PropertyGroup>
        <NumberPropertyField
          label="HELLO Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.helloInterval}
          value={helloInterval}
          min={AODV_MIN_HELLO_INTERVAL}
          disabled={disabled}
          onChange={(event) => onChange(event, "helloInterval", AODV_MIN_HELLO_INTERVAL)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Route Timeout"
          icon={<Clock3 size={12} />}
          valid={!errors?.routeTimeout}
          value={routeTimeout}
          min={AODV_MIN_ROUTE_TIMEOUT}
          disabled={disabled}
          onChange={(event) => onChange(event, "routeTimeout", AODV_MIN_ROUTE_TIMEOUT)}
        />
      </PropertyGroup>
    </>
  );
}
