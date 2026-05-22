import { EventRecorder } from "@/features/processor/EventRecorder.ts";
import type { NodeWrapper } from "@/features/processor/types/node.ts";
import {
  type BatmanCalculationEventDetails,
  type BatmanEchoLocationMessage,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman.ts";
import {
  BATMAN_MAX_THROUGHPUT,
  BATMAN_OGM_HOP_PENALTY_PERCENT,
  BATMAN_TIME_TO_LIVE,
  BATMAN_VERSION,
  BATMAN_WIRED_BASE_THROUGHPUT,
  BATMAN_WIRELESS_BASE_THROUGHPUT,
} from "@/shared/constants/batman.ts";
import { DropReason, EventType, type GetRouteEventDetails } from "@/shared/types/common/events.ts";
import { MessageType, type Message } from "@/shared/types/common/messages.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import type { BatmanConfiguration } from "@/shared/types/model/configurations.ts";
import { getBatmanConfiguration } from "@/shared/types/model/peers.ts";
import {
  applyDistancePenalty,
  applyReceptionPenalty,
  applyWirelessPenalty,
} from "../../utils/batman.ts";
import { getDistance } from "../../utils/connectivity.ts";
import { smooth } from "../../utils/ewma.ts";
import { clone } from "../../utils/messages.ts";
import { BaseModule } from "../BaseModule.ts";
import { NeighbourList } from "./structures/NeighbourList.ts";
import { OriginatorTable } from "./structures/OriginatorTable.ts";

const PROTOCOL = RoutingProtocol.BATMAN;

export class BatmanModule extends BaseModule {
  // routing structures
  private readonly originatorTable: OriginatorTable;
  private readonly neighbourList = new NeighbourList();

  // sequence numbers
  private elpSequence: number = 0;
  private ogmSequence: number = 0;

  constructor(peer: NodeWrapper, eventRecorder: EventRecorder) {
    super(peer, eventRecorder);
    this.INCOMING_MESSAGE_TYPES.push(
      MessageType.BatmanOriginatorMessage,
      MessageType.BatmanEchoLocationMessage,
    );

    const configuration = getBatmanConfiguration(peer.getEntity());
    if (!configuration) {
      throw new Error("BATMAN module requires a BATMAN peer entity.");
    }

    this.originatorTable = new OriginatorTable(
      peer,
      eventRecorder,
      Math.max(1, configuration.purgeTimeout),
      (hopPeerId) => {
        this.neighbourList.delete(hopPeerId);
      },
    );
  }

  override read(message: Message): boolean {
    super.read(message);
    const { type: messageType } = message;

    // Echo Location Protocol message
    if (messageType === MessageType.BatmanEchoLocationMessage) {
      return this.processEchoLocation(message);
    }

    // Originator Message version 2 message
    if (messageType === MessageType.BatmanOriginatorMessage) {
      return this.processOriginatorMessage(message);
    }

    return false;
  }

  private processEchoLocation(message: BatmanEchoLocationMessage): boolean {
    const currentTick = this.eventRecorder.getCurrentTick();
    const { sourceId, senderId, timeToLive, interval } = message;

    if (sourceId === this.peer.id) {
      return true;
    }

    // time to live validation
    if (timeToLive <= 0) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.TimeToLiveExceeded,
      });

      return false;
    }

    // distance calculation
    const distance = getDistance(
      this.peer.getEntity(),
      this.peer.getNeighbour(senderId)!.getEntity(),
    );

    const isWiredLink = this.peer.isLinkedNeighbour(senderId);
    const isWirelessLink = !isWiredLink && this.peer.isRangedNeighbour(senderId);

    // throughput calculation
    const { penaltyDistance, penaltyPercent } = this.peer.getConfiguration() as BatmanConfiguration;
    const linkThroughput = isWirelessLink
      ? BATMAN_WIRELESS_BASE_THROUGHPUT
      : BATMAN_WIRED_BASE_THROUGHPUT;

    let newThroughput = 0;
    if (isWiredLink) {
      newThroughput = linkThroughput;
    } else if (isWirelessLink) {
      newThroughput = applyDistancePenalty(
        linkThroughput,
        distance,
        penaltyDistance,
        penaltyPercent,
      );
    }

    // reception penalting
    const neighbourRecord = this.neighbourList.get(senderId);
    const receptionedThroughput = applyReceptionPenalty(
      newThroughput,
      currentTick,
      neighbourRecord?.lastTick ?? 0,
      interval,
    );

    // EWMA smoothing
    const smoothedThroughput = smooth(receptionedThroughput, neighbourRecord?.throughput ?? null);

    this.neighbourList.put(senderId, {
      neighbourId: senderId,
      lastTick: currentTick,
      interval: interval,
      throughput: smoothedThroughput,
    } as BatmanNeighbourRecord);

    // calculation event recording
    const previousThroughput = neighbourRecord?.throughput ?? null;
    this.recordEvent(
      EventType.Calculation,
      {
        message: clone(message),
        elpProcessing: {
          newThroughput,
          linkThroughput,
          receptionedThroughput,
          previousThroughput,
          smoothedThroughput: smoothedThroughput,
          distance,
          penaltyDistance,
          penaltyPercent,
        },
      } as BatmanCalculationEventDetails,
      PROTOCOL,
    );

    return true;
  }

  private processOriginatorMessage(message: BatmanOriginatorMessage): boolean {
    const { sourceId, senderId, timeToLive, throughput } = message;

    // drop if the message is from the same node
    if (sourceId === this.peer.id) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.SourceIsTarget,
      });

      return true;
    }

    // time to live validation
    const nextTimeToLive = timeToLive - 1;
    if (nextTimeToLive <= 0) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.TimeToLiveExceeded,
      });

      return true;
    }

    // throughput selection and penalting
    const neighbourThroughput = this.neighbourList.get(senderId)!.throughput;
    const selectedThroughput = Math.min(throughput, neighbourThroughput);

    const isWiredHop = this.peer.isLinkedNeighbour(senderId);
    const isWirelessHop = !isWiredHop && this.peer.isRangedNeighbour(senderId);

    const nextThroughput = isWirelessHop
      ? applyWirelessPenalty(selectedThroughput)
      : selectedThroughput;

    // calculation event recording
    this.recordEvent(
      EventType.Calculation,
      {
        message: clone(message),
        ogmProcessing: {
          receivedThroughput: throughput,
          neighbourThroughput,
          selectedThroughput,
          isWirelessHop,
          hopPenaltyPercent: BATMAN_OGM_HOP_PENALTY_PERCENT,
          forwardedThroughput: nextThroughput,
        },
      } as BatmanCalculationEventDetails,
      PROTOCOL,
    );

    // processing of the message and updating the originator table
    const processResult = this.originatorTable.process(message, nextThroughput);
    const { accepted, previousHopId, previousThroughput } = processResult;
    if (!accepted) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.Duplicate,
      });

      return true;
    }

    // route throughput comparison and validation
    if (
      previousHopId !== null &&
      previousHopId !== message.senderId &&
      nextThroughput <= previousThroughput
    ) {
      this.recordEvent(EventType.Drop, {
        message: clone(message),
        reason: DropReason.NotOptimalRoute,
      });

      return true;
    }

    // message rebroadcasting
    const forwarded: BatmanOriginatorMessage = {
      ...message,
      senderId: this.peer.id,
      timeToLive: nextTimeToLive,
      throughput: nextThroughput,
    };

    return super.broadcast(forwarded, true);
  }

  override getRoute(destinationId: UUID): UUID | null {
    const route = this.originatorTable.getBestRoute(destinationId);

    this.recordEvent(
      EventType.GetRoute,
      {
        protocol: PROTOCOL,
        destinationPeerId: destinationId,
        selectedRoute: route ?? null,
      } as GetRouteEventDetails,
      PROTOCOL,
    );

    return route?.hopId ?? null;
  }

  override tick() {
    super.tick();

    this.originatorTable.tick();
  }

  // broadcasts ELP message and updates neighbour list
  refreshEchoLocation(): boolean {
    super.refresh();

    const configuration = getBatmanConfiguration(this.peer.getEntity());
    if (!configuration) {
      return false;
    }

    const neighbours: UUID[] = this.neighbourList.getAll().map((record) => record.neighbourId);

    this.elpSequence += 1;
    const message: BatmanEchoLocationMessage = {
      type: MessageType.BatmanEchoLocationMessage,
      version: BATMAN_VERSION,
      sourceId: this.peer.id,
      senderId: this.peer.id,
      timeToLive: BATMAN_TIME_TO_LIVE,
      numNeighbours: neighbours.length,
      sequence: this.elpSequence,
      interval: configuration.elpInterval,
      neighbours,
    };

    return super.broadcast(message);
  }

  getNeighboursList(): BatmanNeighbourRecord[] {
    return this.neighbourList.getAll();
  }

  // broadcasts OGMv2 messages and updates originator table
  refreshOriginators(): boolean {
    super.refresh();

    this.ogmSequence += 1;
    const message: BatmanOriginatorMessage = {
      type: MessageType.BatmanOriginatorMessage,
      version: BATMAN_VERSION,
      sourceId: this.peer.id,
      senderId: this.peer.id,
      sequence: this.ogmSequence,
      timeToLive: BATMAN_TIME_TO_LIVE,
      throughput: BATMAN_MAX_THROUGHPUT,
    };

    return super.broadcast(message, false);
  }

  getOriginatorTable(): BatmanRouteRecord[] {
    return this.originatorTable.getAllRoutes();
  }
}
