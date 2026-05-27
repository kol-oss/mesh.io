import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import { AODV_MIN_HELLO_INTERVAL, AODV_MIN_ROUTE_TIMEOUT } from "@/shared/constants/protocols/aodv";
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
};

export default function AodvProperties({
  peer,
  updateConfiguration,
  updateConfigurationByProtocol,
}: AodvPropertiesProps) {
  const { helloInterval = AODV_MIN_HELLO_INTERVAL, routeTimeout = AODV_MIN_ROUTE_TIMEOUT } =
    peer.configuration as AodvConfiguration;

  const onChange = getOnConfigurationChange(
    peer,
    updateConfiguration,
    updateConfigurationByProtocol,
  );

  return (
    <>
      <PropertyGroup>
        <NumberPropertyField
          label="HELLO Interval"
          icon={<Clock3 size={12} />}
          valid={helloInterval >= AODV_MIN_HELLO_INTERVAL}
          value={helloInterval}
          min={AODV_MIN_HELLO_INTERVAL}
          onChange={(event) => onChange(event, "helloInterval", AODV_MIN_HELLO_INTERVAL)}
        />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Route Timeout"
          icon={<Clock3 size={12} />}
          valid={routeTimeout >= AODV_MIN_ROUTE_TIMEOUT}
          value={routeTimeout}
          min={AODV_MIN_ROUTE_TIMEOUT}
          onChange={(event) => onChange(event, "routeTimeout", AODV_MIN_ROUTE_TIMEOUT)}
        />
      </PropertyGroup>
    </>
  );
}
