import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionMode as PlacementMode,
  ActionMode as ToolbarMode,
  ActionGroup as ToolbarGroup,
} from "@/shared/types/action";
import type { ActionToolMode, ToolbarPlacementMode } from "@/shared/types/action";
import { useToolbarRedux } from "@/features/tools/hooks/useToolbarRedux";
import { MODE_GROUPS } from "@/features/tools/constants/toolbar";
import ToolbarModeGroup from "../ToolbarModeGroup/ToolbarModeGroup";
import ToolbarActionGroup from "../ToolbarActionGroup/ToolbarActionGroup";

type ToolbarProps = {
  onPlacementModeChange: (mode: ToolbarPlacementMode) => void;
  onRun: () => void;
  onStop: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onInspectionModeChange: (mode: ToolbarMode) => void;
  canGoPrevStep: boolean;
  canGoNextStep: boolean;
  isSimulationActive: boolean;
};

export default function Toolbar({
  onPlacementModeChange,
  onRun,
  onStop,
  onPrevStep,
  onNextStep,
  onInspectionModeChange,
  canGoPrevStep,
  canGoNextStep,
  isSimulationActive,
}: ToolbarProps) {
  const { selectedGroupId, activeItemsByGroup, setGroupMode, setSelectedGroup } = useToolbarRedux();
  const [openedMenuGroup, setOpenedMenuGroup] = useState<ToolbarGroup | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const previousSimulationActiveRef = useRef(isSimulationActive);

  const effectiveSelectedGroupId =
    isSimulationActive &&
    (selectedGroupId === ToolbarGroup.Entities || selectedGroupId === ToolbarGroup.Steps)
      ? ToolbarGroup.Navigation
      : selectedGroupId;

  useEffect(() => {
    if (isSimulationActive && !previousSimulationActiveRef.current) {
      if (selectedGroupId === ToolbarGroup.Entities || selectedGroupId === ToolbarGroup.Steps) {
        setSelectedGroup(ToolbarGroup.Navigation);
      }
    }

    if (!isSimulationActive && previousSimulationActiveRef.current) {
      if (selectedGroupId === ToolbarGroup.Inspection) {
        setSelectedGroup(ToolbarGroup.Navigation);
      }
    }

    previousSimulationActiveRef.current = isSimulationActive;
  }, [isSimulationActive, selectedGroupId, setSelectedGroup]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenedMenuGroup(null);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const entitiesMode = activeItemsByGroup[ToolbarGroup.Entities].key;
    const stepsMode = activeItemsByGroup[ToolbarGroup.Steps].key;
    const textMode = activeItemsByGroup[ToolbarGroup.Text].key;
    const nextPlacementMode: ToolbarPlacementMode =
      effectiveSelectedGroupId === ToolbarGroup.Entities &&
      (entitiesMode === PlacementMode.Peer ||
        entitiesMode === PlacementMode.Link ||
        entitiesMode === PlacementMode.Obstacle)
        ? entitiesMode
        : effectiveSelectedGroupId === ToolbarGroup.Steps &&
            (stepsMode === PlacementMode.Message ||
              stepsMode === PlacementMode.Move ||
              stepsMode === PlacementMode.Toggle)
          ? stepsMode
          : effectiveSelectedGroupId === ToolbarGroup.Text && textMode === PlacementMode.Text
            ? PlacementMode.Text
            : null;

    onPlacementModeChange(nextPlacementMode);
  }, [activeItemsByGroup, effectiveSelectedGroupId, onPlacementModeChange]);

  useEffect(() => {
    if (effectiveSelectedGroupId !== ToolbarGroup.Inspection) {
      onInspectionModeChange(ToolbarMode.NavigationMove);
      return;
    }

    onInspectionModeChange(activeItemsByGroup[ToolbarGroup.Inspection].key as ToolbarMode);
  }, [activeItemsByGroup, effectiveSelectedGroupId, onInspectionModeChange]);

  const handleGroupSelect = useCallback(
    (groupId: ToolbarGroup, modeKey: ActionToolMode, fromMenu: boolean) => {
      setGroupMode(groupId, modeKey);
      setSelectedGroup(groupId);
      if (groupId === ToolbarGroup.Inspection) {
        onInspectionModeChange(modeKey as ToolbarMode);
      }
      if (fromMenu) {
        setOpenedMenuGroup(null);
      }
    },
    [onInspectionModeChange, setGroupMode, setSelectedGroup],
  );

  const handleMenuToggle = useCallback((groupId: ToolbarGroup) => {
    setOpenedMenuGroup((prev) => (prev === groupId ? null : groupId));
  }, []);

  return (
    <div className="toolbar" role="toolbar" aria-label={"Workspace toolbar"} ref={toolbarRef}>
      <div className="toolbar__cluster">
        {MODE_GROUPS.map((group) => {
          const groupIsDisabled =
            isSimulationActive &&
            (group.id === ToolbarGroup.Entities || group.id === ToolbarGroup.Steps);

          return (
            <ToolbarModeGroup
              key={group.id}
              group={group}
              activeItem={activeItemsByGroup[group.id]}
              isSelected={effectiveSelectedGroupId === group.id}
              isDisabled={groupIsDisabled}
              isSimulationActive={isSimulationActive}
              isMenuOpen={openedMenuGroup === group.id}
              onSelect={handleGroupSelect}
              onMenuToggle={handleMenuToggle}
            />
          );
        })}
      </div>

      <span className="toolbar__delimiter" aria-hidden="true" />

      <ToolbarActionGroup
        isSimulationActive={isSimulationActive}
        canGoPrevStep={canGoPrevStep}
        canGoNextStep={canGoNextStep}
        onRun={onRun}
        onStop={onStop}
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
      />
    </div>
  );
}
