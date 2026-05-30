import { getDefaultPeerConfiguration } from "@/shared/constants/protocols/protocol";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "../types/common/uuid";
import type {
  BatmanConfiguration,
  DsdvConfiguration,
  PeerConfiguration,
} from "../types/model/configurations";
import type { PeerEntity } from "../types/model/entities";

export const findById = (id: UUID, peers: PeerEntity[]): PeerEntity | null => {
  return peers.find((peer) => peer.id === id) || null;
};

export const getNameById = (id: UUID, peers: PeerEntity[] = []) => {
  return peers ? findById(id, peers)?.name : undefined;
};

export const getSharedPeerConfiguration = (
  protocol: RoutingProtocol,
  peers: PeerEntity[],
): PeerConfiguration => {
  const defaults = getDefaultPeerConfiguration(protocol);
  const protocolPeer = peers.find((peer) => peer.protocol === protocol);

  if (!protocolPeer) {
    return defaults;
  }

  if (protocol === RoutingProtocol.BATMAN) {
    const configuration = protocolPeer.configuration as BatmanConfiguration;

    return {
      ...defaults,
      penaltyDistance: configuration.penaltyDistance,
      penaltyPercent: configuration.penaltyPercent,
    } as BatmanConfiguration;
  }

  if (protocol === RoutingProtocol.DSDV) {
    const configuration = protocolPeer.configuration as DsdvConfiguration;

    return {
      ...defaults,
      dumpInterval: configuration.dumpInterval,
    } as DsdvConfiguration;
  }

  return defaults;
};
