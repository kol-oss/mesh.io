import { z } from "zod";

export const BaseStepSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  tick: z.number().finite(),
});
