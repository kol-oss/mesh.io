export const ActionGroup = {
  Navigation: "navigation",
  Entities: "entities",
  Steps: "steps",
  Inspection: "inspection",
  Text: "text",
} as const;

export type ActionGroup = (typeof ActionGroup)[keyof typeof ActionGroup];

export const ActionMode = {
  NavigationMove: "navigationMove",
  Peer: "peer",
  Link: "link",
  Obstacle: "obstacle",
  Message: "message",
  Move: "move",
  Toggle: "toggle",
  Text: "text",
  RoutingTable: "routingTable",
  PacketStructure: "packetStructure",
} as const;

export type ActionMode = (typeof ActionMode)[keyof typeof ActionMode];

export const ActionCommand = {
  Run: "run",
  Prev: "prev",
  Next: "next",
} as const;

export type ActionCommand = (typeof ActionCommand)[keyof typeof ActionCommand];

export type PlacementActionMode =
  | typeof ActionMode.Peer
  | typeof ActionMode.Link
  | typeof ActionMode.Obstacle
  | typeof ActionMode.Message
  | typeof ActionMode.Move
  | typeof ActionMode.Toggle
  | typeof ActionMode.Text;

export type ToolbarPlacementMode = PlacementActionMode | null;

export type ToolbarModesByGroup = {
  [ActionGroup.Navigation]: typeof ActionMode.NavigationMove;
  [ActionGroup.Entities]:
    | typeof ActionMode.Peer
    | typeof ActionMode.Link
    | typeof ActionMode.Obstacle;
  [ActionGroup.Steps]:
    | typeof ActionMode.Message
    | typeof ActionMode.Move
    | typeof ActionMode.Toggle;
  [ActionGroup.Inspection]: typeof ActionMode.RoutingTable | typeof ActionMode.PacketStructure;
  [ActionGroup.Text]: typeof ActionMode.Text;
};

export type ToolbarToolMode = ToolbarModesByGroup[keyof ToolbarModesByGroup];

export type InspectionMode =
  | typeof ActionMode.NavigationMove
  | typeof ActionMode.RoutingTable
  | typeof ActionMode.PacketStructure;
