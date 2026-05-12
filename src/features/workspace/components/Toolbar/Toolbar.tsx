import { useEffect, useMemo, useRef, useState } from "react";
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

import { storageKeys } from "../../../../shared/constants/storage";
import { useLocalStorage } from "../../../../shared/hooks/storage/useLocalStorage";
import {
  PlacementMode,
  ToolbarActionKey,
  ToolbarGroupId,
  ToolbarMode,
  TooltipPlacement,
} from "../../../../shared/types/enums";
import type { ToolbarPlacementMode } from "../../../../shared/types/toolbar";
import Tooltip from "../../../../shared/ui/components/Tooltip/Tooltip";

type ToolMode = ToolbarMode | PlacementMode;

type ModeButton = {
  key: ToolMode;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

type ModeGroup = {
  id: ToolbarGroupId;
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

type ModeSelectionsByGroup = Record<ModeGroup["id"], ToolMode>;

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
    id: ToolbarGroupId.Navigation,
    defaultKey: ToolbarMode.NavigationMove,
    hasMenu: true,
    items: [{ key: ToolbarMode.NavigationMove, label: "Move", icon: MousePointer2 }],
  },
  {
    id: ToolbarGroupId.Entities,
    defaultKey: PlacementMode.Peer,
    hasMenu: true,
    items: [
      { key: PlacementMode.Peer, label: "Peer", icon: Radio },
      { key: PlacementMode.Link, label: "Link", icon: Link2 },
      { key: PlacementMode.Obstacle, label: "Obstacle", icon: SquareSlash },
    ],
  },
  {
    id: ToolbarGroupId.Steps,
    defaultKey: PlacementMode.Message,
    hasMenu: true,
    items: [
      { key: PlacementMode.Message, label: "Message", icon: Mail },
      { key: PlacementMode.Move, label: "Move", icon: ChevronsRight },
      { key: PlacementMode.Toggle, label: "Toggle", icon: Activity },
    ],
  },
  {
    id: ToolbarGroupId.Inspection,
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
    id: ToolbarGroupId.Text,
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

const TOOLBAR_GROUP_LABELS: Record<ToolbarGroupId, string> = {
  [ToolbarGroupId.Navigation]: "Navigation",
  [ToolbarGroupId.Entities]: "Entities",
  [ToolbarGroupId.Steps]: "Steps",
  [ToolbarGroupId.Inspection]: "Inspection",
  [ToolbarGroupId.Text]: "Text",
};

const DEFAULT_MODE_SELECTIONS: ModeSelectionsByGroup = {
  [ToolbarGroupId.Navigation]: ToolbarMode.NavigationMove,
  [ToolbarGroupId.Entities]: PlacementMode.Peer,
  [ToolbarGroupId.Steps]: PlacementMode.Message,
  [ToolbarGroupId.Inspection]: ToolbarMode.RoutingTable,
  [ToolbarGroupId.Text]: PlacementMode.Text,
};

const DEFAULT_SELECTED_GROUP: ModeGroup["id"] = ToolbarGroupId.Navigation;

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
  const [selectedModesByGroup, setSelectedModesByGroup] = useLocalStorage<ModeSelectionsByGroup>(
    storageKeys.toolbarModesByGroup,
    DEFAULT_MODE_SELECTIONS,
  );
  const [selectedGroupId, setSelectedGroupId] = useLocalStorage<ModeGroup["id"]>(
    storageKeys.toolbarSelectedGroup,
    DEFAULT_SELECTED_GROUP,
  );
  const [openedMenuGroup, setOpenedMenuGroup] = useState<ModeGroup["id"] | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const previousSimulationActiveRef = useRef(isSimulationActive);

  useEffect(() => {
    if (isSimulationActive && !previousSimulationActiveRef.current) {
      if (selectedGroupId === ToolbarGroupId.Entities || selectedGroupId === ToolbarGroupId.Steps) {
        setSelectedGroupId(ToolbarGroupId.Navigation);
      }
    }

    if (!isSimulationActive && previousSimulationActiveRef.current) {
      if (selectedGroupId === ToolbarGroupId.Inspection) {
        setSelectedGroupId(ToolbarGroupId.Navigation);
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
    : DEFAULT_SELECTED_GROUP;
  const effectiveSelectedGroupId =
    isSimulationActive &&
    (normalizedSelectedGroupId === ToolbarGroupId.Entities ||
      normalizedSelectedGroupId === ToolbarGroupId.Steps)
      ? ToolbarGroupId.Navigation
      : normalizedSelectedGroupId;

  useEffect(() => {
    const entitiesMode = activeItemsByGroup.entities.key;
    const stepsMode = activeItemsByGroup.steps.key;
    const textMode = activeItemsByGroup.text.key;
    const nextPlacementMode: ToolbarPlacementMode =
      effectiveSelectedGroupId === ToolbarGroupId.Entities &&
      (entitiesMode === PlacementMode.Peer ||
        entitiesMode === PlacementMode.Link ||
        entitiesMode === PlacementMode.Obstacle)
        ? entitiesMode
        : effectiveSelectedGroupId === ToolbarGroupId.Steps &&
            (stepsMode === PlacementMode.Message ||
              stepsMode === PlacementMode.Move ||
              stepsMode === PlacementMode.Toggle)
          ? stepsMode
          : effectiveSelectedGroupId === ToolbarGroupId.Text && textMode === PlacementMode.Text
            ? PlacementMode.Text
            : null;

    onPlacementModeChange(nextPlacementMode);
  }, [activeItemsByGroup, effectiveSelectedGroupId, onPlacementModeChange]);

  useEffect(() => {
    if (effectiveSelectedGroupId !== ToolbarGroupId.Inspection) {
      onInspectionModeChange(ToolbarMode.NavigationMove);
      return;
    }

    onInspectionModeChange(activeItemsByGroup.inspection.key as ToolbarMode);
  }, [activeItemsByGroup, effectiveSelectedGroupId, onInspectionModeChange]);

  const setGroupMode = (groupId: ModeGroup["id"], mode: ToolMode) => {
    setSelectedModesByGroup({
      ...selectedModesByGroup,
      [groupId]: mode,
    });
  };

  return (
    <div className="toolbar" role="toolbar" aria-label={"Workspace toolbar"} ref={toolbarRef}>
      <div className="toolbar__cluster">
        {MODE_GROUPS.map((group) => {
          const activeItem = activeItemsByGroup[group.id];
          const ActiveIcon = activeItem.icon;
          const groupIsSelected = effectiveSelectedGroupId === group.id;
          const groupIsDisabled =
            isSimulationActive &&
            (group.id === ToolbarGroupId.Entities || group.id === ToolbarGroupId.Steps);
          const itemIsLocked =
            group.id === ToolbarGroupId.Inspection
              ? !isSimulationActive
              : activeItem.locked === true;
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
                        if (group.id === ToolbarGroupId.Inspection) {
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
                    aria-label={(`Open ${(group.id)} menu`)}
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
                        group.id === ToolbarGroupId.Inspection
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
                            if (group.id === ToolbarGroupId.Inspection) {
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
