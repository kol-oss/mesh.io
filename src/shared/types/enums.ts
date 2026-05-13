export const EntityType = {
  Peer: "PEER",
  Link: "LINK",
  Obstacle: "OBSTACLE",
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const StepType = {
  Move: "MOVE",
  Message: "MESSAGE",
  ToggleStatus: "TOGGLE_STATUS",
  Refresh: "REFRESH",
} as const;

export type StepType = (typeof StepType)[keyof typeof StepType];

export const PlacementMode = {
  Peer: "peer",
  Link: "link",
  Obstacle: "obstacle",
  Message: "message",
  Move: "move",
  Toggle: "toggle",
  Text: "text",
} as const;

export type PlacementMode = (typeof PlacementMode)[keyof typeof PlacementMode];

export const SelectionSource = {
  Entities: "entities",
  Steps: "steps",
} as const;

export type SelectionSource = (typeof SelectionSource)[keyof typeof SelectionSource];

export const DragEntityType = {
  Peer: EntityType.Peer,
  Obstacle: EntityType.Obstacle,
  Text: "TEXT",
} as const;

export type DragEntityType = (typeof DragEntityType)[keyof typeof DragEntityType];

export const DragMode = {
  Move: PlacementMode.Move,
  Resize: "resize",
} as const;

export type DragMode = (typeof DragMode)[keyof typeof DragMode];

export const ResizeEdge = {
  Left: "left",
  Right: "right",
  Top: "top",
  Bottom: "bottom",
} as const;

export type ResizeEdge = (typeof ResizeEdge)[keyof typeof ResizeEdge];

export const ConnectionType = {
  Mutual: "MUTUAL",
  OneWay: "ONE_WAY",
} as const;

export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType];

export const RoutingProtocol = {
  DSDV: "DSDV",
  BATMAN: "BATMAN",
  OLSR: "OLSR",
  AODV: "AODV",
  DSR: "DSR",
} as const;

export type RoutingProtocol = (typeof RoutingProtocol)[keyof typeof RoutingProtocol];

export const SidebarResizeSide = {
  Left: ResizeEdge.Left,
  Right: ResizeEdge.Right,
} as const;

export type SidebarResizeSide = (typeof SidebarResizeSide)[keyof typeof SidebarResizeSide];

export const TooltipPlacement = {
  Top: ResizeEdge.Top,
  Bottom: ResizeEdge.Bottom,
} as const;

export type TooltipPlacement = (typeof TooltipPlacement)[keyof typeof TooltipPlacement];

export const ToolbarGroup = {
  Navigation: "navigation",
  Entities: SelectionSource.Entities,
  Steps: SelectionSource.Steps,
  Inspection: "inspection",
  Text: PlacementMode.Text,
} as const;

export type ToolbarGroup = (typeof ToolbarGroup)[keyof typeof ToolbarGroup];

export const ToolbarMode = {
  NavigationMove: "navigationMove",
  RoutingTable: "routingTable",
  PacketStructure: "packetStructure",
} as const;

export type ToolbarMode = (typeof ToolbarMode)[keyof typeof ToolbarMode];

export const ToolbarActionKey = {
  Run: "run",
  Prev: "prev",
  Next: "next",
} as const;

export type ToolbarActionKey = (typeof ToolbarActionKey)[keyof typeof ToolbarActionKey];
