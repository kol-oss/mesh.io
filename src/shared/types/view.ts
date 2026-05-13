export const SidebarResizeSide = {
  Left: "left",
  Right: "right",
} as const;

export type SidebarResizeSide = (typeof SidebarResizeSide)[keyof typeof SidebarResizeSide];

export const TooltipPlacement = {
  Top: "top",
  Bottom: "bottom",
} as const;

export type TooltipPlacement = (typeof TooltipPlacement)[keyof typeof TooltipPlacement];
