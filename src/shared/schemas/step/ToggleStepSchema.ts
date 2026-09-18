import { StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const ToggleStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Toggle),
  entityId: z.string().nullable(),
  status: z.boolean(),
});

export const createToggleStepPropertiesSchema = (entityIds: Set<string>) => {
  return ToggleStepSchema.pick({
    title: true,
    entityId: true,
  })
    .extend({
      title: z.string().min(1),
    })
    .superRefine((value, context) => {
      if (!value.entityId || !entityIds.has(value.entityId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entityId"],
          message: "Entity is required.",
        });
      }
    });
};
