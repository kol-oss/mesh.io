import type { NetworkEntity } from "../../types/navigation";

export const INITIAL_NETWORK_ENTITIES: NetworkEntity[] = [
  { name: "Core Router", type: "ROUTER", locked: false },
  { name: "Access Point", type: "LINK", locked: false },
  { name: "Fence", type: "OBSTACLE", locked: false },
];
