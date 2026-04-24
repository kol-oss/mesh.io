import type { NetworkEntity } from "../../types/navigation";
import { generateUUID } from "../uuid";

export const INITIAL_NETWORK_ENTITIES: NetworkEntity[] = [
  {
    id: generateUUID(),
    name: "Core Router",
    type: "PEER",
    locked: false,
    x: 300,
    y: 100,
    range: 75,
    enabled: true,
    protocols: ["BATMAN"],
    batmanOgmInterval: 1,
    batmanPurgeTimeout: 10,
  },
  {
    id: generateUUID(),
    name: "Access Point",
    type: "LINK",
    locked: false,
    sourcePeerId: null,
    destinationPeerId: null,
    enabled: true,
  },
  {
    id: generateUUID(),
    name: "Fence",
    type: "OBSTACLE",
    locked: false,
    x: 200,
    y: 200,
    width: 100,
    height: 60,
  },
];
