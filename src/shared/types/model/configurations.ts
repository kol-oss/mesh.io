import type { AodvConfigurationSchema } from "@/shared/schemas/configuration/AodvConfigurationSchema";
import type { BatmanConfigurationSchema } from "@/shared/schemas/configuration/BatmanConfigurationSchema";
import type { DsdvConfigurationSchema } from "@/shared/schemas/configuration/DsdvConfigurationSchema";
import type { DsrConfigurationSchema } from "@/shared/schemas/configuration/DsrConfigurationSchema";
import type { OlsrConfigurationSchema } from "@/shared/schemas/configuration/OlsrConfigurationSchema";
import { z } from "zod";

export type BatmanConfiguration = z.infer<typeof BatmanConfigurationSchema>;
export type DsdvConfiguration = z.infer<typeof DsdvConfigurationSchema>;
export type AodvConfiguration = z.infer<typeof AodvConfigurationSchema>;
export type OlsrConfiguration = z.infer<typeof OlsrConfigurationSchema>;
export type DsrConfiguration = z.infer<typeof DsrConfigurationSchema>;

export type PeerConfiguration =
  | BatmanConfiguration
  | DsdvConfiguration
  | AodvConfiguration
  | OlsrConfiguration
  | DsrConfiguration;
