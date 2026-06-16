import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import type { PeerEntity } from "@/shared/types/model/peers";
import { getSharedPeerConfiguration } from "@/shared/utils/peers";

// validation
export const PEER_MIN_RANGE = 1;

// default properties
export const getDefaultPeer = (x: number, y: number, peers: PeerEntity[] = []): PeerEntity => ({
  id: generateUUID(),
  name: "Peer",
  type: EntityType.Peer,
  locked: false,
  x,
  y,
  range: 150,
  enabled: true,
  protocol: RoutingProtocol.BATMAN,
  configuration: getSharedPeerConfiguration(RoutingProtocol.BATMAN, peers),
});
