import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import { DSR_MIN_ROUTE_TIMEOUT } from "@/shared/constants/protocols/dsr";
import { DsrConfigurationSchema } from "@/shared/schemas/configuration/DsrConfigurationSchema";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { DsrConfiguration, PeerConfiguration } from "@/shared/types/model/configurations";
import { type PeerEntity } from "@/shared/types/model/peers";
import { getOnConfigurationChange } from "@/shared/utils/properties";
import { Clock3 } from "lucide-react";

type DsrPropertiesProps = {
  peer: PeerEntity;
  updateConfiguration: (changes: Partial<PeerConfiguration>) => void;
  updateConfigurationByProtocol: (
    protocol: RoutingProtocol,
    changes: Partial<PeerConfiguration>,
  ) => void;
};

export default function DsrProperties({
  peer,
  updateConfiguration,
  updateConfigurationByProtocol,
}: DsrPropertiesProps) {
  const { routeTimeout = DSR_MIN_ROUTE_TIMEOUT } = peer.configuration as DsrConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  const validation = DsrConfigurationSchema.safeParse(peer.configuration);
  const errors = validation.success ? null : validation.error.flatten().fieldErrors;

  return (
    <PropertyGroup>
      <NumberPropertyField
        label="Route Timeout"
        icon={<Clock3 size={12} />}
        valid={!errors?.routeTimeout}
        value={routeTimeout}
        min={DSR_MIN_ROUTE_TIMEOUT}
        onChange={(event) => onChange(event, "routeTimeout", DSR_MIN_ROUTE_TIMEOUT)}
      />
    </PropertyGroup>
  );
}
