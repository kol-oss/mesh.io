export const StepType = {
  Move: "MOVE",
  Message: "MESSAGE",
  Toggle: "TOGGLE_STATUS",
  Refresh: "REFRESH",
} as const;

export type StepType = (typeof StepType)[keyof typeof StepType];
