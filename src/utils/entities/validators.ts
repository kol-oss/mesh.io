import type { LinkEntity, NetworkEntity, PeerEntity } from "../../types/entities";

export class EntityValidator {
  static isNameValid(name: string): boolean {
    return name.trim().length > 0;
  }

  static isNumberMinimum(value: number, minimum: number): boolean {
    return value >= minimum;
  }

  static isNumberInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
}

export type PeerValidationState = {
  isNameMissing: boolean;
  isProtocolMissing: boolean;
  isBatmanOgmMissing: boolean;
  isBatmanElpMissing: boolean;
  isBatmanPurgeMissing: boolean;
  isBatmanPenaltyDistanceMissing: boolean;
  isBatmanPenaltyPercentMissing: boolean;
};

export function validatePeer(
  peer: PeerEntity,
  minimums: Record<string, number>,
): PeerValidationState {
  const selectedProtocol = peer.protocols[0];
  return {
    isNameMissing: !EntityValidator.isNameValid(peer.name),
    isProtocolMissing: peer.protocols.length !== 1,
    isBatmanOgmMissing:
      selectedProtocol === "BATMAN" && peer.batmanOgmInterval < minimums.ogmInterval,
    isBatmanElpMissing:
      selectedProtocol === "BATMAN" && peer.batmanElpInterval < minimums.elpInterval,
    isBatmanPurgeMissing:
      selectedProtocol === "BATMAN" && peer.batmanPurgeTimeout < minimums.purgeTimeout,
    isBatmanPenaltyDistanceMissing:
      selectedProtocol === "BATMAN" &&
      peer.batmanDistancePenaltyDistance < minimums.distancePenalty,
    isBatmanPenaltyPercentMissing:
      selectedProtocol === "BATMAN" && peer.batmanDistancePenaltyPercent < minimums.penaltyPercent,
  };
}

export type LinkValidationState = {
  isNameMissing: boolean;
  isSourceMissing: boolean;
  isDestinationMissing: boolean;
};

export function validateLink(link: LinkEntity, peers: PeerEntity[]): LinkValidationState {
  const sourceValue =
    link.sourcePeerId && peers.some((peer) => peer.id === link.sourcePeerId)
      ? link.sourcePeerId
      : "";
  const destinationValue =
    link.destinationPeerId &&
    link.destinationPeerId !== sourceValue &&
    peers.some((peer) => peer.id === link.destinationPeerId)
      ? link.destinationPeerId
      : "";

  return {
    isNameMissing: !EntityValidator.isNameValid(link.name),
    isSourceMissing: sourceValue === "",
    isDestinationMissing: destinationValue === "",
  };
}

export type ObstacleValidationState = {
  isNameMissing: boolean;
};

export function validateObstacle(obstacle: NetworkEntity): ObstacleValidationState {
  return {
    isNameMissing: !EntityValidator.isNameValid(obstacle.name),
  };
}
