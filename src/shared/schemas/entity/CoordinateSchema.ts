import { z } from "zod";

export const CoordinateSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
