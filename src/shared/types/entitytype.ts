export const EntityType = {
  Peer: "PEER",
  Link: "LINK",
  Obstacle: "OBSTACLE",
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];
