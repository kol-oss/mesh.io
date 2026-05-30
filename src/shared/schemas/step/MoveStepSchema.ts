import { StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const MoveStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Move),
  entityId: z.string().nullable(),
  x: z.number().finite(),
  y: z.number().finite(),
});
