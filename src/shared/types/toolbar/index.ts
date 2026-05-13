import { PlacementMode, ToolbarGroup, ToolbarMode } from "../enums";

export type ToolbarPlacementMode = PlacementMode | null;

export type ToolbarModesByGroup = {
  [ToolbarGroup.Navigation]: typeof ToolbarMode.NavigationMove;
  [ToolbarGroup.Entities]:
    | typeof PlacementMode.Peer
    | typeof PlacementMode.Link
    | typeof PlacementMode.Obstacle;
  [ToolbarGroup.Steps]:
    | typeof PlacementMode.Message
    | typeof PlacementMode.Move
    | typeof PlacementMode.Toggle;
  [ToolbarGroup.Inspection]: typeof ToolbarMode.RoutingTable | typeof ToolbarMode.PacketStructure;
  [ToolbarGroup.Text]: typeof PlacementMode.Text;
};

export type ToolbarToolMode = ToolbarModesByGroup[keyof ToolbarModesByGroup];
