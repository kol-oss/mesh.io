import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import { OLSR_MIN_INTERVAL } from "@/shared/constants/protocols/olsr";
import { OlsrConfigurationSchema } from "@/shared/schemas/configuration/OlsrConfigurationSchema";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { OlsrConfiguration, PeerConfiguration } from "@/shared/types/model/configurations";
import { type PeerEntity } from "@/shared/types/model/peers";
import { getOnConfigurationChange } from "@/shared/utils/properties";
import { Clock3 } from "lucide-react";

type OlsrPropertiesProps = {
  peer: PeerEntity;
  updateConfiguration: (changes: Partial<PeerConfiguration>) => void;
  updateConfigurationByProtocol: (
    protocol: RoutingProtocol,
    changes: Partial<PeerConfiguration>,
  ) => void;
  disabled?: boolean;
};

export default function OlsrProperties({
  peer,
  updateConfiguration,
  updateConfigurationByProtocol,
  disabled = false,
}: OlsrPropertiesProps) {
  const { helloInterval = OLSR_MIN_INTERVAL, tcInterval = OLSR_MIN_INTERVAL } =
    peer.configuration as OlsrConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  const validation = OlsrConfigurationSchema.safeParse(peer.configuration);
  const errors = validation.success ? null : validation.error.flatten().fieldErrors;

  return (
    <>
      <PropertyGroup>
        <NumberPropertyField
          label="HELLO Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.helloInterval}
          value={helloInterval}
          min={OLSR_MIN_INTERVAL}
          disabled={disabled}
          onChange={(event) => onChange(event, "helloInterval", OLSR_MIN_INTERVAL)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="TC Interval"
          icon={<Clock3 size={12} />}
          valid={!errors?.tcInterval}
          value={tcInterval}
          min={OLSR_MIN_INTERVAL}
          disabled={disabled}
          onChange={(event) => onChange(event, "tcInterval", OLSR_MIN_INTERVAL)}
        />
      </PropertyGroup>
    </>
  );
}
