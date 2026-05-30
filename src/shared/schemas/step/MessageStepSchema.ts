import { StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const MessageStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Message),
  sourceId: z.string().nullable(),
  destinationId: z.string().nullable(),
});

export const createMessageStepPropertiesSchema = (peerIds: Set<string>) => {
  return MessageStepSchema.pick({
    title: true,
    sourceId: true,
    destinationId: true,
  })
    .extend({
      title: z.string().min(1),
    })
    .superRefine((value, context) => {
      if (!value.sourceId || !peerIds.has(value.sourceId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sourceId"],
          message: "Source peer is required.",
        });
      }

      if (!value.destinationId || !peerIds.has(value.destinationId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationId"],
          message: "Destination peer is required.",
        });
      }

      if (value.sourceId && value.destinationId && value.sourceId === value.destinationId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationId"],
          message: "Source and destination peers must be different.",
        });
      }
    });
};
