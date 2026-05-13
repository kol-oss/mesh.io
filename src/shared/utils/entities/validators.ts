import type { LinkEntity, NetworkEntity, PeerEntity } from "../../types/entities";
import { getBatmanConfiguration, getDsdvConfiguration } from "../../types/peers";
import { RoutingProtocol } from "../../types/protocols";

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
  isDsdvIncrementalMissing: boolean;
  isDsdvFullDumpMissing: boolean;
  isDsdvRouteTimeoutMissing: boolean;
};

export function validatePeer(
  peer: PeerEntity,
  minimums: Record<string, number>,
): PeerValidationState {
  const selectedProtocol = peer.protocol;
  const batmanConfiguration = getBatmanConfiguration(peer);
  const dsdvConfiguration = getDsdvConfiguration(peer);
  return {
    isNameMissing: !EntityValidator.isNameValid(peer.name),
    isProtocolMissing: false,
    isBatmanOgmMissing:
      selectedProtocol === RoutingProtocol.BATMAN &&
      (batmanConfiguration?.ogmInterval ?? 0) < minimums.ogmInterval,
    isBatmanElpMissing:
      selectedProtocol === RoutingProtocol.BATMAN &&
      (batmanConfiguration?.elpInterval ?? 0) < minimums.elpInterval,
    isBatmanPurgeMissing:
      selectedProtocol === RoutingProtocol.BATMAN &&
      (batmanConfiguration?.purgeTimeout ?? 0) < minimums.purgeTimeout,
    isBatmanPenaltyDistanceMissing:
      selectedProtocol === RoutingProtocol.BATMAN &&
      (batmanConfiguration?.distancePenaltyDistance ?? 0) < minimums.distancePenalty,
    isBatmanPenaltyPercentMissing:
      selectedProtocol === RoutingProtocol.BATMAN &&
      (batmanConfiguration?.distancePenaltyPercent ?? 0) < minimums.penaltyPercent,
    isDsdvIncrementalMissing:
      selectedProtocol === RoutingProtocol.DSDV &&
      (dsdvConfiguration?.incrementalUpdateInterval ?? 0) < minimums.dsdvIncremental,
    isDsdvFullDumpMissing:
      selectedProtocol === RoutingProtocol.DSDV &&
      (dsdvConfiguration?.fullDumpInterval ?? 0) < minimums.dsdvFullDump,
    isDsdvRouteTimeoutMissing:
      selectedProtocol === RoutingProtocol.DSDV &&
      (dsdvConfiguration?.routeTimeout ?? 0) < minimums.dsdvRouteTimeout,
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
