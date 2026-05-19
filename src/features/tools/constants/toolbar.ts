import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeftCircle,
  ArrowRightCircle,
  ChevronsRight,
  Link2,
  Mail,
  MousePointer2,
  PackageSearch,
  Play,
  Radio,
  SquareSlash,
  TableProperties,
  Type,
} from "lucide-react";

import type { ActionToolMode } from "@/shared/types/action";
import {
  ActionMode as PlacementMode,
  ActionCommand as ToolbarActionKey,
  ActionGroup as ToolbarGroup,
  ActionMode as ToolbarMode,
} from "@/shared/types/action";

export type ToolMode = ActionToolMode;

export type Mode = {
  key: ToolMode;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

export type ModeGroup = {
  id: ToolbarGroup;
  items: Mode[];
  defaultKey: ToolMode;
  hasMenu: boolean;
};

export type Action = {
  key: ToolbarActionKey;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

export const TOOLBAR_ICON_SIZE = 21;
export const TOOLBAR_MENU_ICON_SIZE = 16;
export const TOOLBAR_MENU_CHECK_SIZE = 13;
export const TOOLBAR_ICON_STROKE_WIDTH = 1.2;

export const getModeIconClassName = (mode: ToolMode): string | undefined => {
  if (mode === PlacementMode.Move) {
    return "toolbar__chevrons-icon";
  }
  return undefined;
};

export const MODE_GROUPS: ModeGroup[] = [
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
      { key: ToolbarMode.RoutingTable, label: "Table", icon: TableProperties, locked: true },
      { key: ToolbarMode.PacketStructure, label: "Packet", icon: PackageSearch, locked: true },
    ],
  },
  {
    id: ToolbarGroup.Text,
    defaultKey: PlacementMode.Text,
    hasMenu: false,
    items: [{ key: PlacementMode.Text, label: "Text", icon: Type }],
  },
];

export const ACTIONS: Action[] = [
  { key: ToolbarActionKey.Run, label: "Run", icon: Play },
  { key: ToolbarActionKey.Prev, label: "Previous step", icon: ArrowLeftCircle, locked: true },
  { key: ToolbarActionKey.Next, label: "Next step", icon: ArrowRightCircle, locked: true },
];

export const TOOLBAR_GROUP_LABELS: Record<ToolbarGroup, string> = {
  [ToolbarGroup.Navigation]: "Navigation",
  [ToolbarGroup.Entities]: "Entities",
  [ToolbarGroup.Steps]: "Steps",
  [ToolbarGroup.Inspection]: "Inspection",
  [ToolbarGroup.Text]: "Text",
};
