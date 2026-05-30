import { StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const ToggleStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Toggle),
  entityId: z.string().nullable(),
  status: z.boolean(),
});
