import type { NetworkEntity } from "../../types/navigation";

export const INITIAL_NETWORK_ENTITIES: NetworkEntity[] = [
  { name: "Core Router", type: "ROUTER" },
  { name: "Access Point", type: "LINK" },
  { name: "Fence", type: "OBSTACLE" },
];
