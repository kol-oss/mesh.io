import { z } from "zod";
import { MessageStepSchema } from "./MessageStepSchema";
import { MoveStepSchema } from "./MoveStepSchema";
import { RefreshStepSchema } from "./RefreshStepSchema";
import { ToggleStepSchema } from "./ToggleStepSchema";

export const StepSchema = z.discriminatedUnion("type", [
  MessageStepSchema,
  MoveStepSchema,
  ToggleStepSchema,
  RefreshStepSchema,
]);

export type StepSchemaType = z.infer<typeof StepSchema>;
