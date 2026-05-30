import { DSR_MIN_ROUTE_TIMEOUT } from "@/shared/constants/protocols/dsr";
import { z } from "zod";

export const DsrConfigurationSchema = z.object({
  routeTimeout: z.number().min(DSR_MIN_ROUTE_TIMEOUT),
});
