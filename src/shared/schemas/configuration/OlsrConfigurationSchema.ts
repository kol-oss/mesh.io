import { OLSR_MIN_INTERVAL } from "@/shared/constants/protocols/olsr";
import { z } from "zod";

export const OlsrConfigurationSchema = z.object({
  helloInterval: z.number().min(OLSR_MIN_INTERVAL),
  tcInterval: z.number().min(OLSR_MIN_INTERVAL),
});
