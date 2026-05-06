import { RoutingProtocol } from "../../types/enums";
import { ui } from "../../i18n/messages";
import {
  SimulationEventType,
  SimulationMessageKind,
  type BatmanEchoLocationMessage,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type SimulationMessage,
  type SimulationPacket,
  type ThroughputCalculationEventDetails,
} from "../../types/simulation";
import type { UUID } from "../../types/uuid";
import { SimulationEventRecorder } from "../core/EventRecorder";
import type { SimulationPeerNode } from "../core/runtimeTypes";
import { BatmanOriginatorTable } from "./BatmanOriginatorTable";
import {
  applyDistancePenalty,
  applyFixedHopPenalty,
  clampThroughput,
  getDistanceBetweenPeers,
} from "./batmanMath";
import { cloneMessage } from "./batmanMessage";
import {
  BATMAN_EWMA_ALPHA,
  BATMAN_OGM_HOP_PENALTY_PERCENT,
  BATMAN_STATIC_BASE_THROUGHPUT,
  BATMAN_VERSION,
  BATMAN_WIRELESS_BASE_THROUGHPUT,
} from "../../constants/batman.ts";

type BatmanNeighbourEntry = {
  neighbourId: UUID;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
};

export class BatmanOperations {
  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private readonly originatorTable: BatmanOriginatorTable;

  private readonly neighbourTable: Map<UUID, BatmanNeighbourEntry>;

  constructor(params: {
    routingPeer: SimulationPeerNode;
    eventRecorder: SimulationEventRecorder;
    originatorTable: BatmanOriginatorTable;
    neighbourTable: Map<UUID, BatmanNeighbourEntry>;
  }) {
    this.routingPeer = params.routingPeer;
    this.eventRecorder = params.eventRecorder;
    this.originatorTable = params.originatorTable;
    this.neighbourTable = params.neighbourTable;
  }

  processOgmMessage(message: BatmanOriginatorMessage) {
    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    if (message.version !== BATMAN_VERSION) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmUnsupportedVersion(message.version),
      });
      return false;
    }

    const nextTimeToLive = message.timeToLive - 1;
    if (nextTimeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmTtlReachedZero,
      });
      return false;
    }

    const neighbourEntry = this.neighbourTable.get(message.senderPeerId);
    if (!neighbourEntry) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmDroppedNoElpMetric,
      });
      return false;
    }

    const receivedThroughput = clampThroughput(message.throughput);
    const neighbourThroughput = clampThroughput(neighbourEntry.ewmaThroughput);
    const selectedThroughput = Math.min(receivedThroughput, neighbourThroughput);
    const isStaticHop = this.routingPeer.isLinkedNeighbour(message.senderPeerId);
    const isWirelessHop = !isStaticHop && this.routingPeer.isRangedNeighbour(message.senderPeerId);
    const nextThroughput = isWirelessHop
      ? applyFixedHopPenalty(selectedThroughput)
      : selectedThroughput;
    const reason = ui.runtime.ogmThroughputSelected(
      receivedThroughput,
      neighbourThroughput,
      selectedThroughput,
      nextThroughput,
      isWirelessHop,
    );
    this.recordThroughputCalculated(message, reason, undefined, {
      receivedThroughput,
      neighbourThroughput,
      selectedThroughput,
      isWirelessHop,
      hopPenaltyPercent: BATMAN_OGM_HOP_PENALTY_PERCENT,
      forwardedThroughput: nextThroughput,
    });

    const processed = this.originatorTable.process(
      message.sourcePeerId,
      message.senderPeerId,
      message,
      nextThroughput,
      reason,
    );
    if (!processed.accepted) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.duplicateOgmIgnored,
      });
      return true;
    }

    const rebroadcastAllowedByBestPath =
      processed.previousBestHopPeerId === null ||
      processed.previousBestHopPeerId === message.senderPeerId ||
      nextThroughput > processed.previousBestThroughput;

    if (!rebroadcastAllowedByBestPath) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.ogmSuppressedInferiorPath,
      });
      return true;
    }

    const forwarded: BatmanOriginatorMessage = {
      ...message,
      senderPeerId: this.routingPeer.id,
      timeToLive: nextTimeToLive,
      throughput: nextThroughput,
    };
    return this.broadcast(forwarded);
  }

  routeAndWrite(packet: SimulationPacket) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(packet),
        reason: ui.runtime.packetTtlReachedZero,
      });
      return false;
    }

    const selectedRoute = this.originatorTable.getBestRouteRecord(packet.destinationPeerId);
    if (!selectedRoute) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        reason: ui.runtime.noRouteForDestination,
        reasonCode: "NO_ROUTE",
      });
      return false;
    }

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemRouteSelected, {
      protocol: RoutingProtocol.BATMAN,
      destinationPeerId: packet.destinationPeerId,
      selectedRoute,
      message: cloneMessage(packet),
    });

    return this.write(packet, selectedRoute.hopPeerId);
  }

  write(message: SimulationMessage, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.nextHopNotNeighbour,
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.BATMAN)) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.nextHopNoBatman,
      });
      return false;
    }

    const forwardedMessage =
      message.kind === SimulationMessageKind.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : cloneMessage(message);

    const targetModule = hop.getModule(RoutingProtocol.BATMAN);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  broadcast(message: BatmanOriginatorMessage | BatmanEchoLocationMessage) {
    const neighbours = this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.BATMAN));

    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageBroadcast, {
      neighbourPeerIds: neighbours.map((peer) => peer.id),
      retransmit: message.sourcePeerId !== this.routingPeer.id,
      message: cloneMessage(message),
    });

    let broadcastResult = true;
    for (const neighbour of neighbours) {
      const result = this.write(message, neighbour.id);
      broadcastResult = broadcastResult && result;
    }

    return broadcastResult;
  }

  processEchoLocation(message: BatmanEchoLocationMessage) {
    if (message.sourcePeerId === this.routingPeer.id) {
      return true;
    }

    if (message.version !== BATMAN_VERSION) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.elpUnsupportedVersion(message.version),
      });
      return false;
    }

    if (message.timeToLive <= 0) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.elpTtlReachedZero,
      });
      return false;
    }

    const senderPeer = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!senderPeer) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
        message: cloneMessage(message),
        reason: ui.runtime.nextHopNotNeighbour,
      });
      return false;
    }

    const routingPeerEntity = this.routingPeer.getPeerEntity();
    const senderPeerEntity = senderPeer.getPeerEntity();
    const isStaticLink = this.routingPeer.isLinkedNeighbour(message.senderPeerId);
    const isWirelessLink =
      !isStaticLink && this.routingPeer.isRangedNeighbour(message.senderPeerId);
    const distance = getDistanceBetweenPeers(routingPeerEntity, senderPeerEntity);
    const baseReferenceThroughput = isWirelessLink
      ? BATMAN_WIRELESS_BASE_THROUGHPUT
      : BATMAN_STATIC_BASE_THROUGHPUT;
    const baseThroughput = isWirelessLink
      ? applyDistancePenalty(
          baseReferenceThroughput,
          distance,
          routingPeerEntity.batmanDistancePenaltyDistance,
          routingPeerEntity.batmanDistancePenaltyPercent,
        )
      : baseReferenceThroughput;

    const previous = this.neighbourTable.get(message.senderPeerId);
    const currentTick = this.eventRecorder.getCurrentTick();
    const tickGap = previous ? Math.max(1, currentTick - previous.lastSeen) : 1;
    const expectedGap = previous ? Math.max(1, previous.lastInterval) : 1;
    const receptionRatio = Math.min(1, expectedGap / tickGap);

    const rawMetric = baseThroughput * receptionRatio;

    const nextEwma = previous
      ? BATMAN_EWMA_ALPHA * rawMetric + (1 - BATMAN_EWMA_ALPHA) * previous.ewmaThroughput
      : rawMetric;

    this.neighbourTable.set(message.senderPeerId, {
      neighbourId: message.senderPeerId,
      lastSeen: currentTick,
      lastInterval: Math.max(1, Math.floor(message.interval)),
      ewmaThroughput: clampThroughput(nextEwma),
    });

    const reason = ui.runtime.elpThroughputCalculated(
      baseThroughput,
      receptionRatio,
      rawMetric,
      previous?.ewmaThroughput ?? null,
      nextEwma,
    );
    this.recordThroughputCalculated(message, reason, {
      baseThroughput,
      baseReferenceThroughput,
      receptionRatio,
      rawThroughput: rawMetric,
      previousEwma: previous?.ewmaThroughput ?? null,
      nextEwma,
      distance,
      distancePenaltyDistance: routingPeerEntity.batmanDistancePenaltyDistance,
      distancePenaltyPercent: routingPeerEntity.batmanDistancePenaltyPercent,
    });

    return true;
  }

  getNeighboursTable(): BatmanNeighbourRecord[] {
    return [...this.neighbourTable.values()]
      .map((entry) => ({
        neighbourPeerId: entry.neighbourId,
        quality: clampThroughput(entry.ewmaThroughput),
        lastTick: entry.lastSeen,
        interval: entry.lastInterval,
      }))
      .sort((left, right) => left.neighbourPeerId.localeCompare(right.neighbourPeerId));
  }

  private recordThroughputCalculated(
    message: SimulationMessage,
    reason: string,
    breakdown?: ThroughputCalculationEventDetails["breakdown"],
    ogmSelection?: ThroughputCalculationEventDetails["ogmSelection"],
  ) {
    this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemThroughputCalculated, {
      message: cloneMessage(message),
      reason,
      breakdown,
      ogmSelection,
    });
  }
}
