import type { Mode, ModeGroup } from "@/features/tools/constants/toolbar";
import { MODE_GROUPS } from "@/features/tools/constants/toolbar";
import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import {
  DEFAULT_SELECTED_TOOLBAR_GROUP,
  setSelectedToolbarGroup,
  setToolbarModeForGroup,
} from "@/shared/store/slices/displaySlice";
import type { ActionToolMode } from "@/shared/types/action";
import { useCallback, useMemo } from "react";

export const useToolbarRedux = () => {
  const dispatch = useAppDispatch();

  const selectedModesByGroup = useAppSelector((state) => state.display.toolbarModesByGroup);
  const rawSelectedGroupId = useAppSelector((state) => state.display.selectedToolbarGroup);

  const selectedGroupId = MODE_GROUPS.some((group) => group.id === rawSelectedGroupId)
    ? rawSelectedGroupId
    : DEFAULT_SELECTED_TOOLBAR_GROUP;

  const activeItemsByGroup = useMemo(() => {
    return MODE_GROUPS.reduce<Record<ModeGroup["id"], Mode>>(
      (acc, group) => {
        const selected = group.items.find((item) => item.key === selectedModesByGroup[group.id]);
        const fallback =
          group.items.find((item) => item.key === group.defaultKey) ?? group.items[0];

        acc[group.id] = selected ?? fallback;
        return acc;
      },
      {} as Record<ModeGroup["id"], Mode>,
    );
  }, [selectedModesByGroup]);

  const setGroupMode = useCallback(
    (groupId: ModeGroup["id"], mode: ActionToolMode) => {
      dispatch(setToolbarModeForGroup({ group: groupId, mode }));
    },
    [dispatch],
  );

  const setSelectedGroup = useCallback(
    (groupId: ModeGroup["id"]) => {
      dispatch(setSelectedToolbarGroup(groupId));
    },
    [dispatch],
  );

  return {
    selectedGroupId,
    activeItemsByGroup,
    setGroupMode,
    setSelectedGroup,
  };
};
