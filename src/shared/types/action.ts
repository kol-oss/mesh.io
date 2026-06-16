export enum ActionGroup {
  Navigation = "NAVIGATION",
  Entities = "ENTITIES",
  Steps = "STEPS",
  Inspection = "INSPECTION",
  Text = "TEXT",
}

export enum ActionMode {
  NavigationMove = "NAVIGATION_MOVE",
  Peer = "PEER",
  Link = "LINK",
  Obstacle = "OBSTACLE",
  Message = "MESSAGE",
  Move = "MOVE",
  Toggle = "TOGGLE",
  Text = "TEXT",
  RoutingTable = "ROUTING_TABLE",
  PacketStructure = "PACKET_STRUCTURE",
}

export enum ActionCommand {
  Run = "RUN",
  Prev = "PREV",
  Next = "NEXT",
}

export type ActionPlacementMode =
  | ActionMode.Peer
  | ActionMode.Link
  | ActionMode.Obstacle
  | ActionMode.Message
  | ActionMode.Move
  | ActionMode.Toggle
  | ActionMode.Text;

export type ActionModesByGroup = {
  [ActionGroup.Navigation]: ActionMode.NavigationMove;
  [ActionGroup.Entities]: ActionMode.Peer | ActionMode.Link | ActionMode.Obstacle;
  [ActionGroup.Steps]: ActionMode.Message | ActionMode.Move | ActionMode.Toggle;
  [ActionGroup.Inspection]: ActionMode.RoutingTable | ActionMode.PacketStructure;
  [ActionGroup.Text]: ActionMode.Text;
};

export type ActionToolMode = ActionModesByGroup[keyof ActionModesByGroup];

export type ActionInspectionMode =
  | ActionMode.NavigationMove
  | ActionMode.RoutingTable
  | ActionMode.PacketStructure;

export type ToolbarPlacementMode = ActionPlacementMode | null;
