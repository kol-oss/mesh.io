import { EventRecorder } from "@/features/processor/EventRecorder.ts";
import {
  type BatmanEchoLocationMessage,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type BatmanRouteRecord,
} from "@/features/processor/types/batman.ts";
import type { PeerNode } from "@/features/processor/types/runtime.ts";
import {
  BATMAN_EWMA_ALPHA,
  BATMAN_MAX_THROUGHPUT,
  BATMAN_TIME_TO_LIVE,
  BATMAN_VERSION,
  BATMAN_WIRED_BASE_THROUGHPUT,
  BATMAN_WIRELESS_BASE_THROUGHPUT,
} from "@/shared/constants/batman.ts";
import { EventType } from "@/shared/types/common/events.ts";
import { MessageType, type Message } from "@/shared/types/common/messages.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import type { BatmanConfiguration } from "@/shared/types/model/configurations.ts";
import { getBatmanConfiguration } from "@/shared/types/model/peers.ts";
import { clamp } from "@/shared/utils/math/clamp.ts";
import { applyDistancePenalty } from "../../utils/batman.ts";
import { getDistance } from "../../utils/connectivity.ts";
import { clone } from "../../utils/messages.ts";
import { BaseModule } from "../BaseModule.ts";
import { BatmanOperations } from "./BatmanOperations.ts";
import { NeighbourList } from "./structures/NeighbourList.ts";
import { OriginatorTable } from "./structures/OriginatorTable.ts";

const clampThroughput = (throughput: number) =>
  clamp(Math.floor(throughput), 0, BATMAN_MAX_THROUGHPUT);

export class BatmanModule extends BaseModule {
  // routing structures
  private readonly originatorTable: OriginatorTable;
  private readonly neighbourList = new NeighbourList();

  // sequence numbers
  private elpSequence: number = 0;
  private ogmSequence: number = 0;

  private readonly operations: BatmanOperations;

  constructor(peer: PeerNode, eventRecorder: EventRecorder) {
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
    this.operations = new BatmanOperations(
      peer,
      eventRecorder,
      this.originatorTable,
      this.neighbourList,
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
      return this.operations.processOgmMessage(message);
    }

    return false;
  }

  private processEchoLocation(message: BatmanEchoLocationMessage): boolean {
    const currentTick = this.eventRecorder.getCurrentTick();
    const { sourceId, senderId, timeToLive } = message;

    if (sourceId === this.peer.id) {
      return true;
    }

    // time to live validation
    if (timeToLive <= 0) {
      this.recordEvent(
        EventType.Drop,
        { message: clone(message), reason: "ELP TTL reached zero" },
        RoutingProtocol.BATMAN,
      );

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

      console.log(newThroughput);
    }

    // reception penalting
    const neighbourRecord = this.neighbourList.get(senderId);
    const tickGap = neighbourRecord ? Math.max(1, currentTick - neighbourRecord.lastTick) : 1;
    const expectedGap = neighbourRecord ? Math.max(1, neighbourRecord.interval) : 1;

    const receptionRatio = Math.min(1, expectedGap / tickGap);
    const receptionedThroughput = newThroughput * receptionRatio;

    // EWMA smoothing
    const smoothedThroughput = neighbourRecord
      ? BATMAN_EWMA_ALPHA * receptionedThroughput +
        (1 - BATMAN_EWMA_ALPHA) * neighbourRecord.throughput
      : receptionedThroughput;

    this.neighbourList.put(senderId, {
      neighbourId: senderId,
      lastTick: currentTick,
      interval: Math.max(1, Math.floor(message.interval)),
      throughput: clampThroughput(smoothedThroughput),
    } as BatmanNeighbourRecord);

    const previousThroughput = neighbourRecord?.throughput ?? null;
    this.recordEvent(
      EventType.Calculation,
      {
        message: clone(message),
        reason: "",
        breakdown: {
          newThroughput,
          linkThroughput,
          receptionRatio,
          receptionedThroughput,
          previousThroughput,
          smoothedThroughput: smoothedThroughput,
          distance,
          penaltyDistance,
          penaltyPercent,
        },
      },
      RoutingProtocol.BATMAN,
    );

    return true;
  }

  override getRoute(destinationPeerId: UUID): UUID | null {
    const route = this.originatorTable.getBestRoute(destinationPeerId);
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

    return super.broadcast(message);
  }

  getOriginatorTable(): BatmanRouteRecord[] {
    return this.originatorTable.getAllRoutes();
  }
}
