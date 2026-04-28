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
  Play,
  Radio,
  SquareSlash,
  TableProperties,
  Type,
  ChevronsRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { storageKeys } from "../../constants/storage";
import { useLocalStorage } from "../../hooks/storage/useLocalStorage";
import {
  PlacementMode,
  ToolbarActionKey,
  ToolbarGroupId,
  ToolbarMode,
  TooltipPlacement,
} from "../../types/enums";
import type { ToolbarPlacementMode } from "../../types/toolbar";
import Tooltip from "../Tooltip/Tooltip";

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
      { key: ToolbarMode.RoutingTable, label: "Table", icon: TableProperties, locked: true },
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
  { key: ToolbarActionKey.Prev, label: "Previous step", icon: ArrowLeftCircle, locked: true },
  { key: ToolbarActionKey.Next, label: "Next step", icon: ArrowRightCircle, locked: true },
];

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
};

export default function Toolbar({ onPlacementModeChange }: ToolbarProps) {
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

  useEffect(() => {
    const entitiesMode = activeItemsByGroup.entities.key;
    const stepsMode = activeItemsByGroup.steps.key;
    const textMode = activeItemsByGroup.text.key;
    const nextPlacementMode: ToolbarPlacementMode =
      normalizedSelectedGroupId === ToolbarGroupId.Entities &&
      (entitiesMode === PlacementMode.Peer ||
        entitiesMode === PlacementMode.Link ||
        entitiesMode === PlacementMode.Obstacle)
        ? entitiesMode
        : normalizedSelectedGroupId === ToolbarGroupId.Steps &&
            (stepsMode === PlacementMode.Message ||
              stepsMode === PlacementMode.Move ||
              stepsMode === PlacementMode.Toggle)
          ? stepsMode
          : normalizedSelectedGroupId === ToolbarGroupId.Text && textMode === PlacementMode.Text
            ? PlacementMode.Text
            : null;

    onPlacementModeChange(nextPlacementMode);
  }, [activeItemsByGroup, normalizedSelectedGroupId, onPlacementModeChange]);

  const setGroupMode = (groupId: ModeGroup["id"], mode: ToolMode) => {
    setSelectedModesByGroup({
      ...selectedModesByGroup,
      [groupId]: mode,
    });
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Workspace toolbar" ref={toolbarRef}>
      <div className="toolbar__cluster">
        {MODE_GROUPS.map((group) => {
          const activeItem = activeItemsByGroup[group.id];
          const ActiveIcon = activeItem.icon;
          const groupIsSelected = normalizedSelectedGroupId === group.id;
          const canSelectActiveItem = activeItem.locked !== true;

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
                    disabled={activeItem.locked}
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
                      }
                    }}
                    aria-label={activeItem.label}
                    aria-pressed={groupIsSelected}
                    disabled={activeItem.locked}
                  >
                    <ActiveIcon
                      size={TOOLBAR_ICON_SIZE}
                      strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                      className={getModeIconClassName(activeItem.key)}
                    />
                  </button>
                </Tooltip>

                <Tooltip
                  content={`${group.id.charAt(0).toUpperCase() + group.id.slice(1)}`}
                  placement={TooltipPlacement.Top}
                >
                  <button
                    className={`toolbar__button toolbar__menu-toggle${openedMenuGroup === group.id ? " toolbar__menu-toggle--open" : ""}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenedMenuGroup((prev) => (prev === group.id ? null : group.id));
                    }}
                    aria-label={`Open ${group.id} menu`}
                    aria-expanded={openedMenuGroup === group.id}
                  >
                    <ChevronDown size={10} strokeWidth={TOOLBAR_ICON_STROKE_WIDTH} />
                  </button>
                </Tooltip>

                {openedMenuGroup === group.id && (
                  <div className="toolbar__menu" role="menu" onClick={(e) => e.stopPropagation()}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeItemsByGroup[group.id].key === item.key;

                      return (
                        <button
                          className={`toolbar__menu-option${isActive ? " toolbar__menu-option--active" : ""}`}
                          key={`${group.id}-${item.key}`}
                          type="button"
                          role="menuitem"
                          disabled={item.locked}
                          onClick={() => {
                            if (item.locked) {
                              return;
                            }
                            setGroupMode(group.id, item.key);
                            setSelectedGroupId(group.id);
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
          const Icon = item.icon;
          const isRunAction = item.key === ToolbarActionKey.Run;

          return (
            <Tooltip key={item.key} content={item.label} placement={TooltipPlacement.Top}>
              <button
                className="toolbar__button"
                type="button"
                aria-label={item.label}
                disabled={item.locked}
              >
                <Icon
                  size={TOOLBAR_ICON_SIZE}
                  strokeWidth={TOOLBAR_ICON_STROKE_WIDTH}
                  className={isRunAction ? "toolbar__run-icon" : undefined}
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
