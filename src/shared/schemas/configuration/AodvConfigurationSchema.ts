import { AODV_MIN_HELLO_INTERVAL, AODV_MIN_ROUTE_TIMEOUT } from "@/shared/constants/protocols/aodv";
import { z } from "zod";

export const AodvConfigurationSchema = z.object({
  helloInterval: z.number().min(AODV_MIN_HELLO_INTERVAL),
  routeTimeout: z.number().min(AODV_MIN_ROUTE_TIMEOUT),
});
