import { Pause } from "lucide-react";
import { ActionCommand as ToolbarActionKey } from "@/shared/types/action";
import ToolbarButton from "../ToolbarButton/ToolbarButton";
import { ACTIONS } from "@/features/tools/constants/toolbar";

type ToolbarActionGroupProps = {
  isSimulationActive: boolean;
  canGoPrevStep: boolean;
  canGoNextStep: boolean;
  onRun: () => void;
  onStop: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
};

export default function ToolbarActionGroup({
  isSimulationActive,
  canGoPrevStep,
  canGoNextStep,
  onRun,
  onStop,
  onPrevStep,
  onNextStep,
}: ToolbarActionGroupProps) {
  return (
    <div className="toolbar__group">
      {ACTIONS.map((item) => {
        const isRunAction = item.key === ToolbarActionKey.Run;
        const icon = isRunAction && isSimulationActive ? Pause : item.icon;
        const isDisabled =
          item.key === ToolbarActionKey.Run
            ? false
            : item.key === ToolbarActionKey.Prev
              ? !canGoPrevStep
              : !canGoNextStep;
        const handleClick =
          item.key === ToolbarActionKey.Run
            ? isSimulationActive
              ? onStop
              : onRun
            : item.key === ToolbarActionKey.Prev
              ? onPrevStep
              : onNextStep;
        const label = isRunAction && isSimulationActive ? "Stop simulation" : item.label;

        return (
          <ToolbarButton
            key={item.key}
            icon={icon}
            label={label}
            isDisabled={isDisabled}
            iconClassName={
              isRunAction
                ? isSimulationActive
                  ? "toolbar__stop-icon"
                  : "toolbar__run-icon"
                : undefined
            }
            iconFill={isRunAction ? "currentColor" : "none"}
            onClick={handleClick}
          />
        );
      })}
    </div>
  );
}
