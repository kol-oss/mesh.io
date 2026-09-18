import { ActionGroup } from "../types/action";

export const isGroupDisabled = (group: ActionGroup, isRuntime: boolean): boolean => {
  if (isRuntime) {
    return group === ActionGroup.Entities || group === ActionGroup.Steps;
  } else {
    return group === ActionGroup.Inspection;
  }
};
