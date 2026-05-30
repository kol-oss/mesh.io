import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID } from "@/shared/types/common/uuid";
import type { BatmanConfiguration } from "@/shared/types/model/configurations";
import { EntityType } from "@/shared/types/model/entities";
import type { PeerEntity } from "@/shared/types/model/peers";
import { getDefaultPeerConfiguration } from "../protocols/protocol";

// validation
export const PEER_MIN_RANGE = 1;

// default properties
export const getDefaultPeer = (x: number, y: number): PeerEntity => ({
  id: generateUUID(),
  name: "Peer",
  type: EntityType.Peer,
  locked: false,
  x,
  y,
  range: 150,
  enabled: true,
  protocol: RoutingProtocol.BATMAN,
  configuration: getDefaultPeerConfiguration(RoutingProtocol.BATMAN) as BatmanConfiguration,
});
