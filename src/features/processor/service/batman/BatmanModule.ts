import { EventRecorder } from "@/features/processor/EventRecorder.ts";
import {
  type BatmanEchoLocationMessage,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
} from "@/features/processor/types/batman.ts";
import type { PeerNode, RoutingModule } from "@/features/processor/types/runtime.ts";
import {
  BATMAN_MAX_THROUGHPUT,
  BATMAN_TIME_TO_LIVE,
  BATMAN_VERSION,
} from "@/shared/constants/batman.ts";
import { EventType } from "@/shared/types/common/events.ts";
import { MessageType, type Message, type Packet } from "@/shared/types/common/messages.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import { getBatmanConfiguration } from "@/shared/types/model/peers.ts";
import { clone } from "../../utils/messages.ts";
import { BatmanOperations } from "./BatmanOperations.ts";
import { OriginatorTable } from "./structures/OriginatorTable.ts";
type BatmanNeighbourEntry = {
  neighbourId: UUID;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
};

export class BatmanModule implements RoutingModule {
  private readonly originatorTable: OriginatorTable;

  private readonly operations: BatmanOperations;

  private readonly routingPeer: PeerNode;

  private readonly eventRecorder: EventRecorder;

  private ogmSequence = 0;

  private elpSequence = 0;

  private lastElpTickSent: number | null = null;

  private readonly neighbourTable = new Map<UUID, BatmanNeighbourEntry>();

  constructor(routingPeer: PeerNode, eventRecorder: EventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
    const configuration = getBatmanConfiguration(routingPeer.getEntity());
    if (!configuration) {
      throw new Error("BATMAN module requires a BATMAN peer entity.");
    }
    this.originatorTable = new OriginatorTable(
      routingPeer,
      eventRecorder,
      Math.max(1, configuration.purgeTimeout),
      (hopPeerId) => {
        this.neighbourTable.delete(hopPeerId);
      },
    );
    this.operations = new BatmanOperations({
      routingPeer,
      eventRecorder,
      originatorTable: this.originatorTable,
      neighbourTable: this.neighbourTable,
    });
  }

  read(message: Message): boolean {
    const { type: messageType } = message;
    if (
      messageType !== MessageType.Packet &&
      messageType !== MessageType.BatmanOriginatorMessage &&
      messageType !== MessageType.BatmanEchoLocationMessage
    ) {
      return false;
    }

    if (messageType === MessageType.Packet) {
      if (message.destinationPeerId === this.routingPeer.id) {
        return true;
      }

      const forwardedPacket: Packet = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.operations.routeAndWrite(forwardedPacket);
    }

    if (messageType === MessageType.BatmanEchoLocationMessage) {
      return this.operations.processEchoLocation(message);
    }

    if (messageType !== MessageType.BatmanOriginatorMessage) {
      return false;
    }

    return this.operations.processOgmMessage(message);
  }

  refresh() {
    this.refreshElp();
    this.refreshOgm();
  }

  refreshElp() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.broadcastElp();
  }

  refreshOgm() {
    if (!this.routingPeer.isActive()) {
      return;
    }

    this.ogmSequence += 1;
    const message: BatmanOriginatorMessage = {
      type: MessageType.BatmanOriginatorMessage,
      version: BATMAN_VERSION,
      sourceId: this.routingPeer.id,
      senderId: this.routingPeer.id,
      sequence: this.ogmSequence,
      timeToLive: BATMAN_TIME_TO_LIVE,
      throughput: BATMAN_MAX_THROUGHPUT,
    };

    this.operations.broadcast(message);
  }

  tick() {
    this.originatorTable.tick();
  }

  send(packet: Packet) {
    const sourcePacket: Packet =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.routingPeer.id } : packet;

    if (!this.routingPeer.isActive()) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: clone(sourcePacket),
        reason: "Source peer is disabled",
      });
      return false;
    }

    let remainingRetries = 1;
    let result = false;

    while (!result && remainingRetries-- > 0) {
      result = this.operations.routeAndWrite(sourcePacket);
    }

    return result;
  }

  getRoutes() {
    return this.originatorTable.getAllRoutes();
  }

  getNeighboursTable(): BatmanNeighbourRecord[] {
    return this.operations.getNeighboursTable();
  }

  private broadcastElp() {
    const currentTick = this.eventRecorder.getCurrentTick();
    if (this.lastElpTickSent === currentTick) {
      return;
    }

    this.lastElpTickSent = currentTick;
    this.elpSequence += 1;
    const configuration = getBatmanConfiguration(this.routingPeer.getEntity());
    if (!configuration) {
      return;
    }
    const elpInterval = Math.max(1, Math.floor(configuration.elpInterval));

    const neighbours: UUID[] = [...this.neighbourTable.values()]
      .map((entry) => entry.neighbourId)
      .sort((left, right) => left.localeCompare(right));
    const elpMessage: BatmanEchoLocationMessage = {
      type: MessageType.BatmanEchoLocationMessage,
      version: BATMAN_VERSION,
      sourceId: this.routingPeer.id,
      senderId: this.routingPeer.id,
      timeToLive: BATMAN_TIME_TO_LIVE,
      numNeighbours: neighbours.length,
      sequence: this.elpSequence,
      interval: elpInterval,
      neighbours,
    };

    this.operations.broadcast(elpMessage);
  }
}
