import {
  BATMAN_MAX_THROUGHPUT,
  BATMAN_TIME_TO_LIVE,
  BATMAN_VERSION,
} from "@/shared/constants/batman.ts";
import { EventRecorder } from "@/shared/processor/EventRecorder.ts";
import type { PeerNode, RoutingModule } from "@/shared/processor/types/runtime.ts";
import type { UUID } from "@/shared/types/common/uuid.ts";
import { getBatmanConfiguration } from "@/shared/types/model/peers.ts";
import { EventType } from "@/shared/types/processor/events.ts";
import {
  BatmanPacketType,
  MessageType,
  type BatmanEchoLocationMessage,
  type BatmanEchoLocationNeighbour,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type Packet,
} from "@/shared/types/processor/simulation.ts";
import { cloneMessage, isSimulationMessage } from "./batmanMessage.ts";
import { BatmanOperations } from "./BatmanOperations.ts";
import { BatmanOriginatorTable } from "./BatmanOriginatorTable.ts";
type BatmanNeighbourEntry = {
  neighbourId: UUID;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
};

export class BatmanModule implements RoutingModule {
  private readonly originatorTable: BatmanOriginatorTable;

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
    this.originatorTable = new BatmanOriginatorTable(
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

  read(message: unknown): boolean {
    if (!isSimulationMessage(message)) {
      return false;
    }

    if (message.kind === MessageType.Packet) {
      if (message.destinationPeerId === this.routingPeer.id) {
        return true;
      }

      const forwardedPacket: Packet = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.operations.routeAndWrite(forwardedPacket);
    }

    if (message.kind === MessageType.BatmanEchoLocationMessage) {
      return this.operations.processEchoLocation(message);
    }

    if (message.kind !== MessageType.BatmanOriginatorMessage) {
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
      kind: MessageType.BatmanOriginatorMessage,
      version: BATMAN_VERSION,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
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
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.record(this.routingPeer.id, EventType.Drop, {
        message: cloneMessage(packet),
        reason: "Source peer is disabled",
      });
      return false;
    }

    let remainingRetries = 1;
    let result = false;

    while (!result && remainingRetries-- > 0) {
      result = this.operations.routeAndWrite(packet);
    }

    return result;
  }

  getRoutes() {
    return this.originatorTable.getRoutes();
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

    const neighbours: BatmanEchoLocationNeighbour[] = [...this.neighbourTable.values()]
      .map((entry) => ({
        address: entry.neighbourId,
      }))
      .sort((left, right) => left.address.localeCompare(right.address));

    const elpMessage: BatmanEchoLocationMessage = {
      kind: MessageType.BatmanEchoLocationMessage,
      packetType: BatmanPacketType.EchoLocationProtocol,
      version: BATMAN_VERSION,
      sourcePeerId: this.routingPeer.id,
      senderPeerId: this.routingPeer.id,
      timeToLive: BATMAN_TIME_TO_LIVE,
      numNeighbours: neighbours.length,
      sequence: this.elpSequence,
      interval: elpInterval,
      neighbours,
    };

    this.operations.broadcast(elpMessage);
  }
}
