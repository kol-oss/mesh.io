import { StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const MoveStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Move),
  entityId: z.string().nullable(),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const createMoveStepPropertiesSchema = (peerIds: Set<string>) => {
  return MoveStepSchema.pick({
    title: true,
    entityId: true,
  })
    .extend({
      title: z.string().min(1),
    })
    .superRefine((value, context) => {
      if (!value.entityId || !peerIds.has(value.entityId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entityId"],
          message: "Peer is required.",
        });
      }
    });
};
