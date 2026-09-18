import { RoutingProtocol } from "@/shared/types/common/protocols";
import { RefreshAction, StepType } from "@/shared/types/model/steps";
import { z } from "zod";
import { BaseStepSchema } from "./BaseStepSchema";

export const RefreshStepSchema = BaseStepSchema.extend({
  type: z.literal(StepType.Refresh),
  peerId: z.string(),
  protocol: z.nativeEnum(RoutingProtocol),
  action: z.nativeEnum(RefreshAction).optional(),
  startTick: z.number().finite(),
  interval: z.number().finite(),
});
