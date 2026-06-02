import { OLSR_MIN_INTERVAL, OLSR_MIN_ROUTE_TIMEOUT } from "@/shared/constants/protocols/olsr";
import { z } from "zod";

export const OlsrConfigurationSchema = z.object({
  helloInterval: z.number().min(OLSR_MIN_INTERVAL),
  tcInterval: z.number().min(OLSR_MIN_INTERVAL),
  routeTimeout: z.number().min(OLSR_MIN_ROUTE_TIMEOUT),
}).refine((value) => value.routeTimeout > Math.min(value.tcInterval, value.helloInterval), {
  path: ["routeTimeout"],
  message: "Route timeout must be greater than min(TC interval, HELLO interval)",
});
