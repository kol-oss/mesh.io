import { StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const MessageStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Message),
  sourceId: z.string().nullable(),
  destinationId: z.string().nullable(),
});
