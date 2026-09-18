import { DSDV_MIN_INTERVAL, DSDV_MIN_TIMEOUT } from "@/shared/constants/protocols/dsdv";
import { z } from "zod";

export const DsdvConfigurationSchema = z
  .object({
    refreshInterval: z.number().min(DSDV_MIN_INTERVAL),
    dumpInterval: z.number().min(DSDV_MIN_INTERVAL),
    routeTimeout: z.number().min(DSDV_MIN_TIMEOUT),
  })
  .refine((value) => value.routeTimeout > value.dumpInterval, {
    path: ["routeTimeout"],
    message: "Route timeout must be greater than dump interval.",
  });
