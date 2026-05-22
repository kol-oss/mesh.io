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
import { NeighbourList } from "./structures/NeighbourList.ts";
import { OriginatorTable } from "./structures/OriginatorTable.ts";

const INCOMING_MESSAGE_TYPES = [
  MessageType.Packet,
  MessageType.BatmanOriginatorMessage,
  MessageType.BatmanEchoLocationMessage,
];

export class BatmanModule implements RoutingModule {
  private readonly peer: PeerNode;
  private readonly eventRecorder: EventRecorder;

  // routing structures
  private readonly originatorTable: OriginatorTable;
  private readonly neighbourList = new NeighbourList();

  // sequence numbers
  private elpSequence: number = 0;
  private ogmSequence: number = 0;

  private readonly operations: BatmanOperations;
  private lastElpTickSent: number | null = null;

  constructor(peer: PeerNode, eventRecorder: EventRecorder) {
    this.peer = peer;
    this.eventRecorder = eventRecorder;

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

  // process incoming message from network
  read(message: Message): boolean {
    const { type: messageType } = message;
    if (!INCOMING_MESSAGE_TYPES.includes(messageType)) {
      return false;
    }

    if (messageType === MessageType.Packet) {
      return this.processPacket(message as Packet);
    }

    // Echo Location Protocol message
    if (messageType === MessageType.BatmanEchoLocationMessage) {
      return this.operations.processEchoLocation(message);
    }

    // Originator Message version 2 message
    if (messageType === MessageType.BatmanOriginatorMessage) {
      return this.operations.processOgmMessage(message);
    }

    return false;
  }

  // process routed traffic
  private processPacket(message: Packet): boolean {
    if (message.destinationPeerId === this.peer.id) {
      return true;
    }

    const forwardedPacket: Packet = {
      ...message,
      timeToLive: Math.max(0, message.timeToLive - 1),
    };

    return this.operations.routeAndWrite(forwardedPacket);
  }

  refresh() {
    this.refreshElp();
    this.refreshOgm();
  }

  refreshElp() {
    if (!this.peer.isActive()) {
      return;
    }

    this.broadcastElp();
  }

  refreshOgm() {
    if (!this.peer.isActive()) {
      return;
    }

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

    this.operations.broadcast(message);
  }

  tick() {
    this.originatorTable.tick();
  }

  send(packet: Packet) {
    const sourcePacket: Packet =
      packet.sourcePeerId === null ? { ...packet, sourcePeerId: this.peer.id } : packet;

    if (!this.peer.isActive()) {
      this.eventRecorder.record(this.peer.id, EventType.Drop, {
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
    const configuration = getBatmanConfiguration(this.peer.getEntity());
    if (!configuration) {
      return;
    }
    const elpInterval = Math.max(1, Math.floor(configuration.elpInterval));

    const neighbours: UUID[] = this.neighbourList.getAll().map((record) => record.neighbourId);
    const elpMessage: BatmanEchoLocationMessage = {
      type: MessageType.BatmanEchoLocationMessage,
      version: BATMAN_VERSION,
      sourceId: this.peer.id,
      senderId: this.peer.id,
      timeToLive: BATMAN_TIME_TO_LIVE,
      numNeighbours: neighbours.length,
      sequence: this.elpSequence,
      interval: elpInterval,
      neighbours,
    };

    this.operations.broadcast(elpMessage);
  }
}
