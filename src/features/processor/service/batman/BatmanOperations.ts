import { EventRecorder } from "@/features/processor/EventRecorder.ts";
import {
  type BatmanCalculationEventDetails,
  type BatmanEchoLocationMessage,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
} from "@/features/processor/types/batman.ts";
import type { PeerNode } from "@/features/processor/types/runtime.ts";
import {
  BATMAN_EWMA_ALPHA,
  BATMAN_MAX_THROUGHPUT,
  BATMAN_OGM_HOP_PENALTY_PERCENT,
  BATMAN_STATIC_BASE_THROUGHPUT,
  BATMAN_VERSION,
  BATMAN_WIRELESS_BASE_THROUGHPUT,
} from "@/shared/constants/batman.ts";
import { EventType } from "@/shared/types/common/events.ts";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import { getBatmanConfiguration } from "@/shared/types/model/peers.ts";
import { clamp } from "@/shared/utils/math/clamp.ts";
import { applyDistancePenalty, applyWirelessPenalty } from "../../utils/batman.ts";
import { getDistance } from "../../utils/connectivity.ts";
import { clone } from "../../utils/messages.ts";
import { OriginatorTable } from "./structures/OriginatorTable.ts";

const clampThroughput = (throughput: number) =>
  clamp(Math.floor(throughput), 0, BATMAN_MAX_THROUGHPUT);

type BatmanNeighbourEntry = {
  neighbourId: UUID;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
};

export class BatmanOperations {
  private readonly routingPeer: PeerNode;
  private readonly eventRecorder: EventRecorder;
  private readonly originatorTable: OriginatorTable;
  private readonly neighbourTable: Map<UUID, BatmanNeighbourEntry>;

  constructor(params: {
    routingPeer: PeerNode;
    eventRecorder: EventRecorder;
    originatorTable: OriginatorTable;
    neighbourTable: Map<UUID, BatmanNeighbourEntry>;
  }) {
    this.routingPeer = params.routingPeer;
    this.eventRecorder = params.eventRecorder;
    this.originatorTable = params.originatorTable;
    this.neighbourTable = params.neighbourTable;
  }

  processOgmMessage(message: BatmanOriginatorMessage) {
    if (message.sourceId === this.routingPeer.id) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason:
            "B.A.T.M.A.N. V dropped a rebroadcast OGMv2 because the originator received its own message",
        },
        RoutingProtocol.BATMAN,
      );
      return true;
    }

    if (message.version !== BATMAN_VERSION) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: `B.A.T.M.A.N. V node rejected OGM with unsupported (message.version) ${message.version}`,
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const nextTimeToLive = message.timeToLive - 1;
    if (nextTimeToLive <= 0) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: "B.A.T.M.A.N. V OGMv2 TTL reached zero",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const neighbourEntry = this.neighbourTable.get(message.senderId);
    if (!neighbourEntry) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: "OGM dropped because no ELP neighbour metric exists for this sender",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const receivedThroughput = clampThroughput(message.throughput);
    const neighbourThroughput = clampThroughput(neighbourEntry.ewmaThroughput);
    const selectedThroughput = Math.min(receivedThroughput, neighbourThroughput);
    const isStaticHop = this.routingPeer.isLinkedNeighbour(message.senderId);
    const isWirelessHop = !isStaticHop && this.routingPeer.isRangedNeighbour(message.senderId);
    const nextThroughput = isWirelessHop
      ? applyWirelessPenalty(selectedThroughput)
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

    const processed = this.originatorTable.process(message, nextThroughput);
    if (!processed.accepted) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: "Duplicate B.A.T.M.A.N. V OGMv2 was ignored by the sequence protection window",
        },
        RoutingProtocol.BATMAN,
      );
      return true;
    }

    const rebroadcastAllowedByBestPath =
      processed.previousHopId === null ||
      processed.previousHopId === message.senderId ||
      nextThroughput > processed.previousThroughput;

    if (!rebroadcastAllowedByBestPath) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason:
            "B.A.T.M.A.N. V did not rebroadcast this OGMv2 because it did not arrive from the best or a better-throughput neighbour",
        },
        RoutingProtocol.BATMAN,
      );
      return true;
    }

    const forwarded: BatmanOriginatorMessage = {
      ...message,
      senderId: this.routingPeer.id,
      timeToLive: nextTimeToLive,
      throughput: nextThroughput,
    };
    return this.broadcast(forwarded);
  }

  routeAndWrite(packet: Packet) {
    if (packet.timeToLive <= 0) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(packet),
          reason: "Packet TTL reached zero",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const selectedRoute = this.originatorTable.getBestRoute(packet.destinationPeerId);
    if (!selectedRoute) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(packet),
          reason: "No B.A.T.M.A.N. V route is available for the destination",
          reasonCode: "NO_ROUTE",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    this.eventRecorder.record(
      this.routingPeer.id,
      EventType.GetRoute,
      {
        protocol: RoutingProtocol.BATMAN,
        destinationPeerId: packet.destinationPeerId,
        selectedRoute,
        message: clone(packet),
      },
      RoutingProtocol.BATMAN,
    );

    return this.write(packet, selectedRoute.hopId);
  }

  write(message: Message, hopPeerId: UUID) {
    const hop = this.routingPeer.getNeighbour(hopPeerId);
    if (!hop) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: clone(message),
        reason: "Selected next hop is not a current neighbour",
      });
      return false;
    }

    if (!hop.supports(RoutingProtocol.BATMAN)) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: "Selected next hop does not support B.A.T.M.A.N. V",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const forwardedMessage =
      message.type === MessageType.Packet && message.sourcePeerId === null
        ? { ...message, sourcePeerId: this.routingPeer.id }
        : clone(message);

    if (forwardedMessage.type === MessageType.Packet) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Transfer,
        {
          protocol: RoutingProtocol.BATMAN,
          sourcePeerId: this.routingPeer.id,
          targetPeerId: hopPeerId,
          message: clone(forwardedMessage),
        },
        RoutingProtocol.BATMAN,
      );
    }

    const targetModule = hop.getModule(RoutingProtocol.BATMAN);
    return targetModule?.read(forwardedMessage) ?? false;
  }

  broadcast(message: BatmanOriginatorMessage | BatmanEchoLocationMessage) {
    const neighbours = this.routingPeer
      .getNeighbours()
      .filter((peer) => peer.supports(RoutingProtocol.BATMAN));

    this.eventRecorder.record(
      this.routingPeer.id,
      EventType.Broadcast,
      {
        neighbourPeerIds: neighbours.map((peer) => peer.id),
        retransmit: message.sourceId !== this.routingPeer.id,
        message: clone(message),
      },
      RoutingProtocol.BATMAN,
    );

    let broadcastResult = true;
    for (const neighbour of neighbours) {
      const result = this.write(message, neighbour.id);
      broadcastResult = broadcastResult && result;
    }

    return broadcastResult;
  }

  processEchoLocation(message: BatmanEchoLocationMessage) {
    if (message.sourceId === this.routingPeer.id) {
      return true;
    }

    if (message.version !== BATMAN_VERSION) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: `ELP rejected packet with unsupported (message.version) ${message.version}`,
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    if (message.timeToLive <= 0) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: "ELP TTL reached zero",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const senderPeer = this.routingPeer.getNeighbour(message.senderId);
    if (!senderPeer) {
      this.eventRecorder.record(
        this.routingPeer.id,
        EventType.Drop,
        {
          message: clone(message),
          reason: "Selected next hop is not a current neighbour",
        },
        RoutingProtocol.BATMAN,
      );
      return false;
    }

    const routingPeerEntity = this.routingPeer.getEntity();
    const routingConfiguration = getBatmanConfiguration(routingPeerEntity);
    if (!routingConfiguration) {
      return false;
    }
    const senderPeerEntity = senderPeer.getEntity();
    const isStaticLink = this.routingPeer.isLinkedNeighbour(message.senderId);
    const isWirelessLink = !isStaticLink && this.routingPeer.isRangedNeighbour(message.senderId);
    const distance = getDistance(routingPeerEntity, senderPeerEntity);
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

    const previous = this.neighbourTable.get(message.senderId);
    const currentTick = this.eventRecorder.getCurrentTick();
    const tickGap = previous ? Math.max(1, currentTick - previous.lastSeen) : 1;
    const expectedGap = previous ? Math.max(1, previous.lastInterval) : 1;
    const receptionRatio = Math.min(1, expectedGap / tickGap);

    const rawMetric = baseThroughput * receptionRatio;

    const nextEwma = previous
      ? BATMAN_EWMA_ALPHA * rawMetric + (1 - BATMAN_EWMA_ALPHA) * previous.ewmaThroughput
      : rawMetric;

    this.neighbourTable.set(message.senderId, {
      neighbourId: message.senderId,
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
        neighbourId: entry.neighbourId,
        throughput: clampThroughput(entry.ewmaThroughput),
        lastTick: entry.lastSeen,
        interval: entry.lastInterval,
      }))
      .sort((left, right) => left.neighbourId.localeCompare(right.neighbourId));
  }

  private recordThroughputCalculated(
    message: Message,
    reason: string,
    breakdown?: BatmanCalculationEventDetails["breakdown"],
    ogmSelection?: BatmanCalculationEventDetails["ogmSelection"],
  ) {
    this.eventRecorder.record(
      this.routingPeer.id,
      EventType.Calculation,
      {
        message: clone(message),
        reason,
        breakdown,
        ogmSelection,
      },
      RoutingProtocol.BATMAN,
    );
  }
}
