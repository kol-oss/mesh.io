import {
  BATMAN_EWMA_ALPHA,
  BATMAN_OGM_HOP_PENALTY_PERCENT,
  BATMAN_STATIC_BASE_THROUGHPUT,
  BATMAN_VERSION,
  BATMAN_WIRELESS_BASE_THROUGHPUT,
} from "@/shared/constants/batman.ts";
import { EventRecorder } from "@/shared/processor/core/EventRecorder.ts";
import type { PeerNode } from "@/shared/processor/core/runtimeTypes.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import { getBatmanConfiguration } from "@/shared/types/model/peers.ts";
import {
  EventType,
  MessageType,
  type BatmanEchoLocationMessage,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type Message,
  type Packet,
  type ThroughputCalculationEventDetails,
} from "@/shared/types/model/simulation.ts";
import { BatmanOriginatorTable } from "./BatmanOriginatorTable.ts";
import {
  applyDistancePenalty,
  applyFixedHopPenalty,
  clampThroughput,
  getDistanceBetweenPeers,
} from "./batmanMath.ts";
import { cloneMessage } from "./batmanMessage.ts";

type BatmanNeighbourEntry = {
  neighbourId: UUID;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
};

export class BatmanOperations {
  private readonly routingPeer: PeerNode;

  private readonly eventRecorder: EventRecorder;

  private readonly originatorTable: BatmanOriginatorTable;

  private readonly neighbourTable: Map<UUID, BatmanNeighbourEntry>;

  constructor(params: {
    routingPeer: PeerNode;
    eventRecorder: EventRecorder;
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
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: `B.A.T.M.A.N. V node rejected OGM with unsupported (message.version) ${message.version}`,
      });
      return false;
    }

    const nextTimeToLive = message.timeToLive - 1;
    if (nextTimeToLive <= 0) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "B.A.T.M.A.N. V OGMv2 TTL reached zero",
      });
      return false;
    }

    const neighbourEntry = this.neighbourTable.get(message.senderPeerId);
    if (!neighbourEntry) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "OGM dropped because no ELP neighbour metric exists for this sender",
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
    const reason = isWirelessHop
      ? `ELP neighbour metric ${neighbourThroughput} and incoming OGM throughput ${receivedThroughput} were combined by min() = ${selectedThroughput}. Wireless hop penalty 5.8% then produced forwarded throughput ${nextThroughput}.`
      : `ELP neighbour metric ${neighbourThroughput} and incoming OGM throughput ${receivedThroughput} were combined by min() = ${selectedThroughput}. Static hop keeps throughput ${nextThroughput} without 5.8% wireless penalty.`;
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
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "Duplicate B.A.T.M.A.N. V OGMv2 was ignored by the sequence protection window",
      });
      return true;
    }

    const rebroadcastAllowedByBestPath =
      processed.previousBestHopPeerId === null ||
      processed.previousBestHopPeerId === message.senderPeerId ||
      nextThroughput > processed.previousBestThroughput;

    if (!rebroadcastAllowedByBestPath) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason:
          "B.A.T.M.A.N. V did not rebroadcast this OGMv2 because it did not arrive from the best or a better-throughput neighbour",
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

  routeAndWrite(packet: Packet) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(packet),
        reason: "Packet TTL reached zero",
      });
      return false;
    }

    const selectedRoute = this.originatorTable.getBestRouteRecord(packet.destinationPeerId);
    if (!selectedRoute) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        reason: "No B.A.T.M.A.N. V route is available for the destination",
        reasonCode: "NO_ROUTE",
      });
      return false;
    }

    this.eventRecorder.record(this.routingPeer.id, EventType.GetRoute, {
      protocol: RoutingProtocol.BATMAN,
      destinationPeerId: packet.destinationPeerId,
      selectedRoute,
      message: cloneMessage(packet),
    });

    return this.write(packet, selectedRoute.hopPeerId);
  }

  write(message: Message, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "Selected next hop is not a current neighbour",
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.BATMAN)) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "Selected next hop does not support B.A.T.M.A.N. V",
      });
      return false;
    }

    const forwardedMessage =
      message.kind === MessageType.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : cloneMessage(message);

    const targetModule = hop.getModule(RoutingProtocol.BATMAN);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  broadcast(message: BatmanOriginatorMessage | BatmanEchoLocationMessage) {
    const neighbours = this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.BATMAN));

    this.eventRecorder.record(this.routingPeer.id, EventType.Broadcast, {
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
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: `ELP rejected packet with unsupported (message.version) ${message.version}`,
      });
      return false;
    }

    if (message.timeToLive <= 0) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "ELP TTL reached zero",
      });
      return false;
    }

    const senderPeer = this.routingPeer.getNeighbour(message.senderPeerId);
    if (!senderPeer) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(message),
        reason: "Selected next hop is not a current neighbour",
      });
      return false;
    }

    const routingPeerEntity = this.routingPeer.getEntity();
    const routingConfiguration = getBatmanConfiguration(routingPeerEntity);
    if (!routingConfiguration) {
      return false;
    }
    const senderPeerEntity = senderPeer.getEntity();
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
          routingConfiguration.distancePenaltyDistance,
          routingConfiguration.distancePenaltyPercent,
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

    const previousEwma = previous?.ewmaThroughput ?? null;
    const reason =
      previousEwma === null
        ? `ELP metric calculation: base throughput ${baseThroughput}, reception ratio ${receptionRatio.toFixed(2)}, raw metric ${rawMetric.toFixed(2)}, initial EWMA ${nextEwma.toFixed(2)}.`
        : `ELP metric calculation: base throughput ${baseThroughput}, reception ratio ${receptionRatio.toFixed(2)}, raw metric ${rawMetric.toFixed(2)}, EWMA old ${previousEwma.toFixed(2)} -> new ${nextEwma.toFixed(2)} (alpha 0.2).`;
    this.recordThroughputCalculated(message, reason, {
      baseThroughput,
      baseReferenceThroughput,
      receptionRatio,
      rawThroughput: rawMetric,
      previousEwma,
      nextEwma,
      distance,
      distancePenaltyDistance: routingConfiguration.distancePenaltyDistance,
      distancePenaltyPercent: routingConfiguration.distancePenaltyPercent,
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
    message: Message,
    reason: string,
    breakdown?: ThroughputCalculationEventDetails["breakdown"],
    ogmSelection?: ThroughputCalculationEventDetails["ogmSelection"],
  ) {
    this.eventRecorder.record(this.routingPeer.id, EventType.Calculation, {
      message: cloneMessage(message),
      reason,
      breakdown,
      ogmSelection,
    });
  }
}
