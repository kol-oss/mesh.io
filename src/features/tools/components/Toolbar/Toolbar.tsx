import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftCircle,
  ArrowRightCircle,
  Check,
  ChevronDown,
  Link2,
  Mail,
  MousePointer2,
  PackageSearch,
  Pause,
  Play,
  Radio,
  SquareSlash,
  TableProperties,
  Type,
  ChevronsRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/shared/store/hooks";
import {
  DEFAULT_SELECTED_TOOLBAR_GROUP,
  setSelectedToolbarGroup,
  setToolbarModeForGroup,
} from "@/shared/store/slices/displaySlice";
import {
  ActionMode as PlacementMode,
  ActionMode as ToolbarMode,
  ActionGroup as ToolbarGroup,
  ActionCommand as ToolbarActionKey,
} from "@/shared/types/action";
import { TooltipPlacement } from "@/shared/types/view/view";
import type { ActionToolMode, ToolbarPlacementMode } from "@/shared/types/action";
import Tooltip from "@/shared/components/Tooltip/Tooltip";

type ToolMode = ActionToolMode;

type ModeButton = {
  key: ToolMode;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

type ModeGroup = {
  id: ToolbarGroup;
  items: ModeButton[];
  defaultKey: ToolMode;
  hasMenu: boolean;
};

type ActionButton = {
  key: ToolbarActionKey;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

const TOOLBAR_ICON_SIZE = 21;
const TOOLBAR_MENU_ICON_SIZE = 16;
const TOOLBAR_MENU_CHECK_SIZE = 13;

const TOOLBAR_ICON_STROKE_WIDTH = 1.2;

const getModeIconClassName = (mode: ToolMode) => {
  if (mode === PlacementMode.Move) {
    return "toolbar__chevrons-icon";
  }

  return undefined;
};

const MODE_GROUPS: ModeGroup[] = [
  {
    id: ToolbarGroup.Navigation,
    defaultKey: ToolbarMode.NavigationMove,
    hasMenu: true,
    items: [{ key: ToolbarMode.NavigationMove, label: "Move", icon: MousePointer2 }],
  },
  {
    id: ToolbarGroup.Entities,
    defaultKey: PlacementMode.Peer,
    hasMenu: true,
    items: [
      { key: PlacementMode.Peer, label: "Peer", icon: Radio },
      { key: PlacementMode.Link, label: "Link", icon: Link2 },
      { key: PlacementMode.Obstacle, label: "Obstacle", icon: SquareSlash },
    ],
  },
  {
    id: ToolbarGroup.Steps,
    defaultKey: PlacementMode.Message,
    hasMenu: true,
    items: [
      { key: PlacementMode.Message, label: "Message", icon: Mail },
      { key: PlacementMode.Move, label: "Move", icon: ChevronsRight },
      { key: PlacementMode.Toggle, label: "Toggle", icon: Activity },
    ],
  },
  {
    id: ToolbarGroup.Inspection,
    defaultKey: ToolbarMode.RoutingTable,
    hasMenu: true,
    items: [
      {
        key: ToolbarMode.RoutingTable,
        label: "Table",
        icon: TableProperties,
        locked: true,
      },
      {
        key: ToolbarMode.PacketStructure,
        label: "Packet",
        icon: PackageSearch,
        locked: true,
      },
    ],
  },
  {
    id: ToolbarGroup.Text,
    defaultKey: PlacementMode.Text,
    hasMenu: false,
    items: [{ key: PlacementMode.Text, label: "Text", icon: Type }],
  },
];

const ACTIONS: ActionButton[] = [
  { key: ToolbarActionKey.Run, label: "Run", icon: Play },
  {
    key: ToolbarActionKey.Prev,
    label: "Previous step",
    icon: ArrowLeftCircle,
    locked: true,
  },
  {
    key: ToolbarActionKey.Next,
    label: "Next step",
    icon: ArrowRightCircle,
    locked: true,
  },
];

const TOOLBAR_GROUP_LABELS: Record<ToolbarGroup, string> = {
  [ToolbarGroup.Navigation]: "Navigation",
  [ToolbarGroup.Entities]: "Entities",
  [ToolbarGroup.Steps]: "Steps",
  [ToolbarGroup.Inspection]: "Inspection",
  [ToolbarGroup.Text]: "Text",
};

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
  const dispatch = useAppDispatch();
  const selectedModesByGroup = useAppSelector((state) => state.display.toolbarModesByGroup);
  const selectedGroupId = useAppSelector((state) => state.display.selectedToolbarGroup);
  const [openedMenuGroup, setOpenedMenuGroup] = useState<ModeGroup["id"] | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const previousSimulationActiveRef = useRef(isSimulationActive);

  const setSelectedGroupId = useCallback(
    (groupId: ModeGroup["id"]) => {
      dispatch(setSelectedToolbarGroup(groupId));
    },
    [dispatch],
  );

  useEffect(() => {
    if (isSimulationActive && !previousSimulationActiveRef.current) {
      if (selectedGroupId === ToolbarGroup.Entities || selectedGroupId === ToolbarGroup.Steps) {
        setSelectedGroupId(ToolbarGroup.Navigation);
      }
    }

    if (!isSimulationActive && previousSimulationActiveRef.current) {
      if (selectedGroupId === ToolbarGroup.Inspection) {
        setSelectedGroupId(ToolbarGroup.Navigation);
      }
    }

    previousSimulationActiveRef.current = isSimulationActive;
  }, [isSimulationActive, selectedGroupId, setSelectedGroupId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenedMenuGroup(null);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const activeItemsByGroup = useMemo(() => {
    return MODE_GROUPS.reduce<Record<ModeGroup["id"], ModeButton>>(
      (acc, group) => {
        const selected = group.items.find((item) => item.key === selectedModesByGroup[group.id]);
        const fallback =
          group.items.find((item) => item.key === group.defaultKey) ?? group.items[0];

        acc[group.id] = selected ?? fallback;
        return acc;
      },
      {} as Record<ModeGroup["id"], ModeButton>,
    );
  }, [selectedModesByGroup]);

  const normalizedSelectedGroupId = MODE_GROUPS.some((group) => group.id === selectedGroupId)
    ? selectedGroupId
    : DEFAULT_SELECTED_TOOLBAR_GROUP;
  const effectiveSelectedGroupId =
    isSimulationActive &&
    (normalizedSelectedGroupId === ToolbarGroup.Entities ||
      normalizedSelectedGroupId === ToolbarGroup.Steps)
      ? ToolbarGroup.Navigation
      : normalizedSelectedGroupId;

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

  const setGroupMode = useCallback(
    (groupId: ModeGroup["id"], mode: ActionToolMode) => {
      dispatch(setToolbarModeForGroup({ group: groupId, mode }));
    },
    [dispatch],
  );

  return (
    <div className="toolbar" role="toolbar" aria-label={"Workspace toolbar"} ref={toolbarRef}>
      <div className="toolbar__cluster">
        {MODE_GROUPS.map((group) => {
          const activeItem = activeItemsByGroup[group.id];
          const ActiveIcon = activeItem.icon;
          const groupIsSelected = effectiveSelectedGroupId === group.id;
          const groupIsDisabled =
            isSimulationActive &&
            (group.id === ToolbarGroup.Entities || group.id === ToolbarGroup.Steps);
          const itemIsLocked =
            group.id === ToolbarGroup.Inspection ? !isSimulationActive : activeItem.locked === true;
          const canSelectActiveItem = !groupIsDisabled && !itemIsLocked;

          if (!group.hasMenu) {
            return (
              <div className="toolbar__group" key={group.id}>
                <Tooltip content={`${activeItem.label}`} placement={TooltipPlacement.Top}>
                  <button
                    className={`toolbar__button${groupIsSelected ? " toolbar__button--active" : ""}`}
                    type="button"
                    onClick={() => {
                      if (canSelectActiveItem) {
                        setGroupMode(group.id, activeItem.key);
                        setSelectedGroupId(group.id);
                      }
                    }}
                    aria-label={activeItem.label}
                    aria-pressed={groupIsSelected}
                    disabled={itemIsLocked || groupIsDisabled}
                  >
                    <ActiveIcon
                      size={TOOLBAR_ICON_SIZE}
                      strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                      className={getModeIconClassName(activeItem.key)}
                    />
                  </button>
                </Tooltip>
              </div>
            );
          }

          return (
            <div className="toolbar__group" key={group.id}>
              <div className="toolbar__menu-group">
                <Tooltip content={activeItem.label} placement={TooltipPlacement.Top}>
                  <button
                    className={`toolbar__button toolbar__menu-trigger${groupIsSelected ? " toolbar__button--active" : ""}`}
                    type="button"
                    onClick={() => {
                      if (canSelectActiveItem) {
                        setGroupMode(group.id, activeItem.key);
                        setSelectedGroupId(group.id);
                        if (group.id === ToolbarGroup.Inspection) {
                          onInspectionModeChange(activeItem.key as ToolbarMode);
                        }
                      }
                    }}
                    aria-label={activeItem.label}
                    aria-pressed={groupIsSelected}
                    disabled={itemIsLocked || groupIsDisabled}
                  >
                    <ActiveIcon
                      size={TOOLBAR_ICON_SIZE}
                      strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                      className={getModeIconClassName(activeItem.key)}
                    />
                  </button>
                </Tooltip>

                <Tooltip content={TOOLBAR_GROUP_LABELS[group.id]} placement={TooltipPlacement.Top}>
                  <button
                    className={`toolbar__button toolbar__menu-toggle${openedMenuGroup === group.id ? " toolbar__menu-toggle--open" : ""}`}
                    type="button"
                    onClick={(event) => {
                      if (groupIsDisabled || itemIsLocked) {
                        return;
                      }
                      event.stopPropagation();
                      setOpenedMenuGroup((prev) => (prev === group.id ? null : group.id));
                    }}
                    aria-label={`Open ${group.id} menu`}
                    aria-expanded={openedMenuGroup === group.id}
                    disabled={groupIsDisabled || itemIsLocked}
                  >
                    <ChevronDown size={10} strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} />
                  </button>
                </Tooltip>

                {openedMenuGroup === group.id && (
                  <div className="toolbar__menu" role="menu" onClick={(e) => e.stopPropagation()}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeItemsByGroup[group.id].key === item.key;
                      const optionIsLocked =
                        group.id === ToolbarGroup.Inspection
                          ? !isSimulationActive
                          : item.locked === true;

                      return (
                        <button
                          className={`toolbar__menu-option${isActive ? " toolbar__menu-option--active" : ""}`}
                          key={`${group.id}-${item.key}`}
                          type="button"
                          role="menuitem"
                          disabled={optionIsLocked || groupIsDisabled}
                          onClick={() => {
                            if (optionIsLocked || groupIsDisabled) {
                              return;
                            }
                            setGroupMode(group.id, item.key);
                            setSelectedGroupId(group.id);
                            if (group.id === ToolbarGroup.Inspection) {
                              onInspectionModeChange(item.key as ToolbarMode);
                            }
                            setOpenedMenuGroup(null);
                          }}
                        >
                          <span className="toolbar__menu-check" aria-hidden="true">
                            {isActive ? (
                              <Check
                                size={TOOLBAR_MENU_CHECK_SIZE}
                                strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                              />
                            ) : null}
                          </span>
                          <Icon
                            size={TOOLBAR_MENU_ICON_SIZE}
                            strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                            className={getModeIconClassName(item.key)}
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <span className="toolbar__delimiter" aria-hidden="true" />

      <div className="toolbar__group">
        {ACTIONS.map((item) => {
          const isRunAction = item.key === ToolbarActionKey.Run;
          const Icon = isRunAction && isSimulationActive ? Pause : item.icon;
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
          const label =
            item.key === ToolbarActionKey.Run && isSimulationActive
              ? "Stop simulation"
              : item.label;

          return (
            <Tooltip key={item.key} content={label} placement={TooltipPlacement.Top}>
              <button
                className="toolbar__button"
                type="button"
                aria-label={label}
                disabled={isDisabled}
                onClick={handleClick}
              >
                <Icon
                  size={TOOLBAR_ICON_SIZE}
                  strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                  className={
                    isRunAction
                      ? isSimulationActive
                        ? "toolbar__stop-icon"
                        : "toolbar__run-icon"
                      : undefined
                  }
                  fill={isRunAction ? "currentColor" : "none"}
                />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
