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
import { ActionCommand, ActionGroup, ActionMode } from "@/shared/types/action";

export type ToolMode = ActionToolMode;

export type Mode = {
  key: ToolMode;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

export type ModeGroup = {
  id: ActionGroup;
  items: Mode[];
  defaultKey: ToolMode;
  hasMenu: boolean;
};

export type Action = {
  key: ActionCommand;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
};

export const TOOLBAR_ICON_SIZE = 21;
export const TOOLBAR_MENU_ICON_SIZE = 16;
export const TOOLBAR_MENU_CHECK_SIZE = 13;
export const TOOLBAR_ICON_STROKE_WIDTH = 1.2;

export const getModeIconClassName = (mode: ToolMode): string | undefined => {
  if (mode === ActionMode.Move) {
    return "toolbar__chevrons-icon";
  }
  return undefined;
};

export const MODE_GROUPS: ModeGroup[] = [
  {
    id: ActionGroup.Navigation,
    defaultKey: ActionMode.NavigationMove,
    hasMenu: true,
    items: [{ key: ActionMode.NavigationMove, label: "Move", icon: MousePointer2 }],
  },
  {
    id: ActionGroup.Entities,
    defaultKey: ActionMode.Peer,
    hasMenu: true,
    items: [
      { key: ActionMode.Peer, label: "Peer", icon: Radio },
      { key: ActionMode.Link, label: "Link", icon: Link2 },
      { key: ActionMode.Obstacle, label: "Obstacle", icon: SquareSlash },
    ],
  },
  {
    id: ActionGroup.Steps,
    defaultKey: ActionMode.Message,
    hasMenu: true,
    items: [
      { key: ActionMode.Message, label: "Message", icon: Mail },
      { key: ActionMode.Move, label: "Move", icon: ChevronsRight },
      { key: ActionMode.Toggle, label: "Toggle", icon: Activity },
    ],
  },
  {
    id: ActionGroup.Inspection,
    defaultKey: ActionMode.RoutingTable,
    hasMenu: true,
    items: [
      { key: ActionMode.RoutingTable, label: "Table", icon: TableProperties, locked: true },
      { key: ActionMode.PacketStructure, label: "Packet", icon: PackageSearch, locked: true },
    ],
  },
  {
    id: ActionGroup.Text,
    defaultKey: ActionMode.Text,
    hasMenu: false,
    items: [{ key: ActionMode.Text, label: "Text", icon: Type }],
  },
];

export const ACTIONS: Action[] = [
  { key: ActionCommand.Run, label: "Run", icon: Play },
  { key: ActionCommand.Prev, label: "Previous step", icon: ArrowLeftCircle, locked: true },
  { key: ActionCommand.Next, label: "Next step", icon: ArrowRightCircle, locked: true },
];

export const TOOLBAR_GROUP_LABELS: Record<ActionGroup, string> = {
  [ActionGroup.Navigation]: "Navigation",
  [ActionGroup.Entities]: "Entities",
  [ActionGroup.Steps]: "Steps",
  [ActionGroup.Inspection]: "Inspection",
  [ActionGroup.Text]: "Text",
};
