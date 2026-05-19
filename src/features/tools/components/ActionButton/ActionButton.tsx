import { type Action } from "@/features/tools/constants/toolbar";
import { ActionCommand as ToolbarActionKey } from "@/shared/types/action";
import { Pause } from "lucide-react";
import Button from "../Button/Button";

type ActionButtonProps = {
  item: Action;
  isRuntime: boolean;
  prevExist: boolean;
  nextExist: boolean;
  onRun: () => void;
  onStop: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
};

export default function ActionButton({
  item,
  isRuntime,
  prevExist,
  nextExist,
  onRun,
  onStop,
  onPrevStep,
  onNextStep,
}: ActionButtonProps) {
  const { key, icon } = item;

  const onClick = () => {
    if (key === ToolbarActionKey.Run) {
      return isRuntime ? onStop() : onRun();
    }

    return key === ToolbarActionKey.Prev ? onPrevStep() : onNextStep();
  };

  const getIsDisabled = (key: ToolbarActionKey): boolean => {
    if (key === ToolbarActionKey.Run) {
      return false;
    }

    return key === ToolbarActionKey.Prev ? !prevExist : !nextExist;
  };

  const isRunAction = key === ToolbarActionKey.Run;
  const buttonIcon = isRunAction && isRuntime ? Pause : icon;
  const label = isRunAction && isRuntime ? "Stop simulation" : item.label;

  return (
    <Button
      key={key}
      icon={buttonIcon}
      name={label}
      isDisabled={getIsDisabled(key)}
      iconClassName={
        isRunAction ? (isRuntime ? "toolbar__stop-icon" : "toolbar__run-icon") : undefined
      }
      iconFill={isRunAction ? "currentColor" : "none"}
      onClick={onClick}
    />
  );
}
