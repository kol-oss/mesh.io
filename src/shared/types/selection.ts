export const SelectionType = {
  Entities: "entities",
  Steps: "steps",
} as const;

export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType];
