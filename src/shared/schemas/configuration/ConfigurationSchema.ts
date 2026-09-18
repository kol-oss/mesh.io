import { AodvConfigurationSchema } from "@/shared/schemas/configuration/AodvConfigurationSchema";
import { BatmanConfigurationSchema } from "@/shared/schemas/configuration/BatmanConfigurationSchema";
import { DsdvConfigurationSchema } from "@/shared/schemas/configuration/DsdvConfigurationSchema";
import { DsrConfigurationSchema } from "@/shared/schemas/configuration/DsrConfigurationSchema";
import { OlsrConfigurationSchema } from "@/shared/schemas/configuration/OlsrConfigurationSchema";
import { RoutingProtocol } from "@/shared/types/common/protocols";

export const getConfigurationSchema = (protocol: RoutingProtocol) => {
  switch (protocol) {
    case RoutingProtocol.BATMAN:
      return BatmanConfigurationSchema;
    case RoutingProtocol.DSDV:
      return DsdvConfigurationSchema;
    case RoutingProtocol.AODV:
      return AodvConfigurationSchema;
    case RoutingProtocol.OLSR:
      return OlsrConfigurationSchema;
    case RoutingProtocol.DSR:
      return DsrConfigurationSchema;
  }
};
