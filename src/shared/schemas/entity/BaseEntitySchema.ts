import { ENTITY_MIN_NAME_LENGTH } from "@/shared/constants/entities/common";
import { z } from "zod";

export const BaseEntitySchema = z.object({
  id: z.string(),
  name: z.string().min(ENTITY_MIN_NAME_LENGTH),
  locked: z.boolean().optional(),
});
