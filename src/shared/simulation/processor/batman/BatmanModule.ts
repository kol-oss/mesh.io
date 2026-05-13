import {
  BatmanPacketType,
  SimulationEventType,
  SimulationMessageKind,
  type BatmanEchoLocationMessage,
  type BatmanEchoLocationNeighbour,
  type BatmanNeighbourRecord,
  type BatmanOriginatorMessage,
  type SimulationPacket,
} from "../../types/simulation.ts";
import type { UUID } from "../../types/uuid.ts";
import { SimulationEventRecorder } from "../core/EventRecorder.ts";
import type { PacketCapableModule, SimulationPeerNode } from "../core/runtimeTypes.ts";
import { BatmanOriginatorTable } from "./BatmanOriginatorTable.ts";
import { cloneMessage, isSimulationMessage } from "./batmanMessage.ts";
import { BatmanOperations } from "./BatmanOperations.ts";
import {
  BATMAN_MAX_THROUGHPUT,
  BATMAN_TIME_TO_LIVE,
  BATMAN_VERSION,
} from "../../constants/batman.ts";
import { getBatmanConfiguration } from "../../../types/peers";
type BatmanNeighbourEntry = {
  neighbourId: UUID;
  lastSeen: number;
  lastInterval: number;
  ewmaThroughput: number;
};

export class BatmanModule implements PacketCapableModule {
  private readonly originatorTable: BatmanOriginatorTable;

  private readonly operations: BatmanOperations;

  private readonly routingPeer: SimulationPeerNode;

  private readonly eventRecorder: SimulationEventRecorder;

  private ogmSequence = 0;

  private elpSequence = 0;

  private lastElpTickSent: number | null = null;

  private readonly neighbourTable = new Map<UUID, BatmanNeighbourEntry>();

  constructor(routingPeer: SimulationPeerNode, eventRecorder: SimulationEventRecorder) {
    this.routingPeer = routingPeer;
    this.eventRecorder = eventRecorder;
    const configuration = getBatmanConfiguration(routingPeer.getPeerEntity());
    if (!configuration) {
      throw new Error("BATMAN module requires a BATMAN peer entity.");
    }
    this.originatorTable = new BatmanOriginatorTable(
      routingPeer,
      eventRecorder,
      Math.max(1, configuration.purgeTimeout),
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

    if (message.kind === SimulationMessageKind.Packet) {
      if (message.destinationPeerId === this.routingPeer.id) {
        return true;
      }

      const forwardedPacket: SimulationPacket = {
        ...message,
        timeToLive: Math.max(0, message.timeToLive - 1),
      };
      return this.operations.routeAndWrite(forwardedPacket);
    }

    if (message.kind === SimulationMessageKind.BatmanEchoLocationMessage) {
      return this.operations.processEchoLocation(message);
    }

    if (message.kind !== SimulationMessageKind.BatmanOriginatorMessage) {
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
      kind: SimulationMessageKind.BatmanOriginatorMessage,
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

  send(packet: SimulationPacket) {
    if (!this.routingPeer.isActive()) {
      this.eventRecorder.save(this.routingPeer.id, SimulationEventType.SystemMessageDropped, {
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
    const configuration = getBatmanConfiguration(this.routingPeer.getPeerEntity());
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
      kind: SimulationMessageKind.BatmanEchoLocationMessage,
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
