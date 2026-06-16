import { PEER_MIN_RANGE } from "@/shared/constants/entities/peer";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { EntityType } from "@/shared/types/model/entities";
import { z } from "zod";
import { AodvConfigurationSchema } from "../configuration/AodvConfigurationSchema";
import { BatmanConfigurationSchema } from "../configuration/BatmanConfigurationSchema";
import { DsdvConfigurationSchema } from "../configuration/DsdvConfigurationSchema";
import { DsrConfigurationSchema } from "../configuration/DsrConfigurationSchema";
import { OlsrConfigurationSchema } from "../configuration/OlsrConfigurationSchema";
import { BaseEntitySchema } from "./BaseEntitySchema";
import { CoordinateSchema } from "./CoordinateSchema";

const PeerEntityBaseSchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.Peer),
  enabled: z.boolean(),
})
  .merge(CoordinateSchema)
  .extend({
    range: z.number().min(PEER_MIN_RANGE),
  });

export const PeerEntitySchema = z.union([
  PeerEntityBaseSchema.extend({
    protocol: z.literal(RoutingProtocol.BATMAN),
    configuration: BatmanConfigurationSchema,
  }),
  PeerEntityBaseSchema.extend({
    protocol: z.literal(RoutingProtocol.DSDV),
    configuration: DsdvConfigurationSchema,
  }),
  PeerEntityBaseSchema.extend({
    protocol: z.literal(RoutingProtocol.AODV),
    configuration: AodvConfigurationSchema,
  }),
  PeerEntityBaseSchema.extend({
    protocol: z.literal(RoutingProtocol.OLSR),
    configuration: OlsrConfigurationSchema,
  }),
  PeerEntityBaseSchema.extend({
    protocol: z.literal(RoutingProtocol.DSR),
    configuration: DsrConfigurationSchema,
  }),
]);

export const PeerPropertiesSchema = PeerEntityBaseSchema.pick({
  name: true,
  range: true,
});
