import { ACTIONS, MODE_GROUPS } from "@/features/tools/constants/toolbar";
import { useToolbarRedux } from "@/features/tools/hooks/useToolbarRedux";
import type { ActionToolMode, ToolbarPlacementMode } from "@/shared/types/action";
import { ActionGroup, ActionMode } from "@/shared/types/action";
import { isGroupDisabled } from "@/shared/utils/action";
import { useCallback, useEffect, useRef, useState } from "react";
import ActionButton from "../ActionButton/ActionButton";
import ModeButton from "../ModeButton/ModeButton";

const DEFAULT_GROUP = ActionGroup.Navigation;

type ToolbarProps = {
  isRuntime: boolean;
  prevExist: boolean;
  nextExist: boolean;
  onPlacementModeChange: (mode: ToolbarPlacementMode) => void;
  onRun: () => void;
  onStop: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onInspectionModeChange: (mode: ActionMode) => void;
};

export default function Toolbar({
  isRuntime,
  prevExist,
  nextExist,
  onPlacementModeChange,
  onRun,
  onStop,
  onPrevStep,
  onNextStep,
  onInspectionModeChange,
}: ToolbarProps) {
  const {
    selectedGroupId: group,
    activeItemsByGroup: activeModes,
    setGroupMode,
    setSelectedGroup,
  } = useToolbarRedux();
  const [openedMenuGroup, setOpenedMenuGroup] = useState<ActionGroup | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  if (isGroupDisabled(group, isRuntime)) {
    setSelectedGroup(DEFAULT_GROUP);
  }

  useEffect(() => {
    let placementMode: ToolbarPlacementMode = null;
    if (group === ActionGroup.Entities) {
      placementMode = activeModes[ActionGroup.Entities].key as ToolbarPlacementMode;
    }

    if (group === ActionGroup.Steps) {
      placementMode = activeModes[ActionGroup.Steps].key as ToolbarPlacementMode;
    }

    if (group === ActionGroup.Text) {
      placementMode = activeModes[ActionGroup.Text].key as ToolbarPlacementMode;
    }
    onPlacementModeChange(placementMode);
  }, [group, activeModes, onPlacementModeChange]);

  useEffect(() => {
    if (group !== ActionGroup.Inspection) {
      onInspectionModeChange(ActionMode.NavigationMove);
      return;
    }

    onInspectionModeChange(activeModes[ActionGroup.Inspection].key as ActionMode);
  }, [activeModes, group, onInspectionModeChange]);

  const handleGroupSelect = useCallback(
    (groupId: ActionGroup, mode: ActionToolMode, fromMenu: boolean) => {
      setGroupMode(groupId, mode);
      setSelectedGroup(groupId);
      if (groupId === ActionGroup.Inspection) {
        onInspectionModeChange(mode as ActionMode);
      }
      if (fromMenu) {
        setOpenedMenuGroup(null);
      }
    },
    [onInspectionModeChange, setGroupMode, setSelectedGroup],
  );

  const handleMenuToggle = useCallback((groupId: ActionGroup) => {
    setOpenedMenuGroup((prev) => (prev === groupId ? null : groupId));
  }, []);

  return (
    <div className="toolbar" role="toolbar" aria-label={"Workspace toolbar"} ref={toolbarRef}>
      <div className="toolbar__cluster">
        {MODE_GROUPS.map((modeGroup) => {
          return (
            <ModeButton
              key={modeGroup.id}
              group={modeGroup}
              mode={activeModes[modeGroup.id]}
              isActive={group === modeGroup.id}
              isDisabled={isGroupDisabled(modeGroup.id, isRuntime)}
              isOpened={openedMenuGroup === modeGroup.id}
              onSelect={handleGroupSelect}
              onToggle={handleMenuToggle}
            />
          );
        })}
      </div>

      <span className="toolbar__delimiter" aria-hidden="true" />

      <div className="toolbar__group">
        {ACTIONS.map((item) => (
          <ActionButton
            key={item.label}
            item={item}
            isRuntime={isRuntime}
            prevExist={prevExist}
            nextExist={nextExist}
            onRun={onRun}
            onStop={onStop}
            onPrevStep={onPrevStep}
            onNextStep={onNextStep}
          />
        ))}
      </div>
    </div>
  );
}
