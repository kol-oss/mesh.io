import { EntityType } from "@/shared/types/model/entities";
import { z } from "zod";
import { BaseEntitySchema } from "./BaseEntitySchema";

export const LinkEntitySchema = BaseEntitySchema.extend({
  type: z.literal(EntityType.Link),
  sourcePeerId: z.string().nullable(),
  destinationPeerId: z.string().nullable(),
  enabled: z.boolean(),
});

export const createLinkPropertiesSchema = (peerIds: Set<string>) => {
  return LinkEntitySchema.pick({
    name: true,
    sourcePeerId: true,
    destinationPeerId: true,
  }).superRefine((value, context) => {
    if (!value.sourcePeerId || !peerIds.has(value.sourcePeerId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourcePeerId"],
        message: "Source peer is required.",
      });
    }

    if (!value.destinationPeerId || !peerIds.has(value.destinationPeerId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationPeerId"],
        message: "Destination peer is required.",
      });
    }

    if (
      value.sourcePeerId &&
      value.destinationPeerId &&
      value.sourcePeerId === value.destinationPeerId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["destinationPeerId"],
        message: "Source and destination peers must be different.",
      });
    }
  });
};
