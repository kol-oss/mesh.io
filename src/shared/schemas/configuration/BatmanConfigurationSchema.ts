import { z } from "zod";
import {
  BATMAN_MIN_DISTANCE_PENALTY,
  BATMAN_MIN_ELP_INTERVAL,
  BATMAN_MIN_OGM_INTERVAL,
  BATMAN_MIN_PENALTY_PERCENT,
  BATMAN_MIN_PURGE_TIMEOUT,
} from "../../constants/protocols/batman";

export const BatmanConfigurationSchema = z.object({
  penaltyDistance: z.number().min(BATMAN_MIN_DISTANCE_PENALTY),
  penaltyPercent: z.number().min(BATMAN_MIN_PENALTY_PERCENT),
  elpInterval: z.number().min(BATMAN_MIN_ELP_INTERVAL),
  ogmInterval: z.number().min(BATMAN_MIN_OGM_INTERVAL),
  purgeTimeout: z.number().min(BATMAN_MIN_PURGE_TIMEOUT),
});
