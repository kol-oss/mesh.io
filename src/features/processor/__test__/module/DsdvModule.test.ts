import { DsdvModule } from "@/features/processor/module/dsdv/DsdvModule";
import { DsdvRoutingTable } from "@/features/processor/module/dsdv/structures/DsdvRoutingTable";
import type { Peer } from "@/features/processor/types/network/peer";
import {
  DsdvUpdateType,
  type DsdvRouteUpdateMessage,
  type DsdvRouteUpdateRecordEntry,
} from "@/features/processor/types/protocols/dsdv";
import {
  DSDV_DEFAULT_CONFIGURATION,
  DSDV_METRIC_INFINITY,
} from "@/shared/constants/protocols/dsdv";
import { DropReason, EventType } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import type { DsdvConfiguration } from "@/shared/types/model/configurations";
import { RefreshAction } from "@/shared/types/model/steps";
import { describe, expect, it, jest } from "@jest/globals";
import { makeEventRecorder, makeGraph, makePeer as makePeerBase } from "../helpers";

const SELF_ID: UUID = generateUUID();
const NEIGHBOUR_ID: UUID = generateUUID();
const REMOTE_ID: UUID = generateUUID();

const DEFAULT_CONFIG: DsdvConfiguration = { ...DSDV_DEFAULT_CONFIGURATION };

function makePeer(id: UUID, active = true, config: DsdvConfiguration = DEFAULT_CONFIG): Peer {
  return makePeerBase(id, RoutingProtocol.DSDV, config, active);
}

function makeRouteUpdate(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  entries: DsdvRouteUpdateRecordEntry[],
  overrides: Partial<DsdvRouteUpdateMessage> = {},
): DsdvRouteUpdateMessage {
  return {
    type: MessageType.DsdvRouteUpdateMessage,
    updateType: DsdvUpdateType.FullDump,
    sourcePeerId,
    senderPeerId,
    hopCount: 0,
    entries,
    ...overrides,
  };
}

function makeRouteEntry(
  destinationPeerId: UUID,
  nextHopPeerId: UUID,
  sequenceNumber = 2,
  metric = 1,
): DsdvRouteUpdateRecordEntry {
  return { destinationPeerId, nextHopPeerId, sequenceNumber, metric };
}

function makeModule(peerId = SELF_ID, peers: Peer[] = [], config?: DsdvConfiguration, tick = 10) {
  const selfPeer = makePeer(peerId, true, config ?? DEFAULT_CONFIG);
  const recorder = makeEventRecorder(tick);
  const graph = makeGraph(selfPeer, peers);
  const module = new DsdvModule(peerId, graph, recorder);
  module.init();
  return { module, selfPeer, recorder, graph };
}

type DsdvModuleTestAccess = {
  process(message: Message): boolean;
  processRouteUpdate(message: DsdvRouteUpdateMessage): boolean;
  processDumpRefresh(): void;
  processIncrementalRefresh(): void;
  routingTable: DsdvRoutingTable;
};

function asInternal(module: DsdvModule): DsdvModuleTestAccess {
  return module as unknown as DsdvModuleTestAccess;
}

describe("DSDV module", () => {
  describe("initialization", () => {
    it("initialises without error", () => {
      expect(() => makeModule()).not.toThrow();
    });

    it("getTables returns empty routing table initially", () => {
      const { module } = makeModule();
      expect(module.getTables().DSDV_ROUTING_TABLE).toEqual([]);
    });
  });

  describe("process – unrecognised message type", () => {
    it("returns false for an unhandled message type", () => {
      const { module } = makeModule();
      const result = asInternal(module).process({ type: MessageType.Packet } as unknown as Message);
      expect(result).toBe(false);
    });
  });

  describe("processRouteUpdate", () => {
    it("drops and returns false when sourcePeerId equals self (SourceIsTarget)", () => {
      const { module, recorder } = makeModule();
      const msg = makeRouteUpdate(SELF_ID, SELF_ID, [makeRouteEntry(REMOTE_ID, SELF_ID)]);
      const result = asInternal(module).processRouteUpdate(msg);

      expect(result).toBe(false);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.SourceIsTarget }),
        RoutingProtocol.DSDV,
      );
    });

    it("inserts a new route and fires AddRoute event", () => {
      const { module, recorder } = makeModule();
      const msg = makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, [
        makeRouteEntry(REMOTE_ID, NEIGHBOUR_ID),
      ]);
      asInternal(module).processRouteUpdate(msg);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.AddRoute,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      expect(module.getTables().DSDV_ROUTING_TABLE).toHaveLength(1);
      expect(module.getTables().DSDV_ROUTING_TABLE[0].nextHopPeerId).toBe(NEIGHBOUR_ID);
    });

    it("updates existing route with newer sequence and fires UpdateRoute event", () => {
      const { module, recorder } = makeModule();
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, 1, 2);
      recorder.record.mockClear();

      asInternal(module).processRouteUpdate(
        makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, [
          makeRouteEntry(REMOTE_ID, NEIGHBOUR_ID, 4, 1),
        ]),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.UpdateRoute,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
    });

    it("drops non-optimal update (same sequence, worse metric) with NotOptimalRoute", () => {
      const { module, recorder } = makeModule();
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, 1, 4);
      recorder.record.mockClear();

      asInternal(module).processRouteUpdate(
        makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, [
          makeRouteEntry(REMOTE_ID, NEIGHBOUR_ID, 4, 3),
        ]),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.NotOptimalRoute }),
        RoutingProtocol.DSDV,
      );
    });

    it("removes route on infinity metric with odd sequence and fires DeleteRoute event", () => {
      const { module, recorder } = makeModule();
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, 1, 2);
      recorder.record.mockClear();

      asInternal(module).processRouteUpdate(
        makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, [
          makeRouteEntry(REMOTE_ID, NEIGHBOUR_ID, 3, DSDV_METRIC_INFINITY),
        ]),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.DeleteRoute,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      expect(module.getTables().DSDV_ROUTING_TABLE).toHaveLength(0);
    });
  });

  describe("getRoute", () => {
    it("returns null when no route exists", () => {
      const { module } = makeModule();
      expect(module.getRoute(REMOTE_ID)).toBeNull();
    });

    it("returns nextHopPeerId and fires GetRoute event when route exists", () => {
      const { module, recorder } = makeModule();
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, 1, 2);
      recorder.record.mockClear();

      const hop = module.getRoute(REMOTE_ID);

      expect(hop).toBe(NEIGHBOUR_ID);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.GetRoute,
        expect.objectContaining({ destinationPeerId: REMOTE_ID }),
        RoutingProtocol.DSDV,
      );
    });

    it("returns null for a route with infinity metric", () => {
      const { module } = makeModule();
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, DSDV_METRIC_INFINITY, 2);
      expect(module.getRoute(REMOTE_ID)).toBeNull();
    });
  });

  describe("processRefresh FullDump", () => {
    it("inserts self route and broadcasts FullDump on first call", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      module.refresh(RefreshAction.DsdvFullDump);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.AddRoute,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      expect(module.getTables().DSDV_ROUTING_TABLE).toHaveLength(1);
    });

    it("increments self route sequence by 2 and broadcasts UpdateRoute on subsequent call", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      module.refresh(RefreshAction.DsdvFullDump);
      recorder.record.mockClear();

      module.refresh(RefreshAction.DsdvFullDump);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.UpdateRoute,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
    });
  });

  describe("processRefresh Incremental", () => {
    it("fires Drop(Skip) when no pending routes", () => {
      const { module, recorder } = makeModule();
      module.refresh(RefreshAction.DsdvIncremental);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Skip }),
        RoutingProtocol.DSDV,
      );
    });

    it("broadcasts Incremental update and clears pending routes when pending exist", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteUpdate(
        makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, [makeRouteEntry(REMOTE_ID, NEIGHBOUR_ID)]),
      );
      recorder.record.mockClear();

      module.refresh(RefreshAction.DsdvIncremental);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      // pending routes cleared — a second incremental should fire Skip
      recorder.record.mockClear();
      module.refresh(RefreshAction.DsdvIncremental);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Skip }),
        RoutingProtocol.DSDV,
      );
    });
  });

  describe("processTick", () => {
    it("expires old routes and fires DeleteRoute event", () => {
      const { module, recorder } = makeModule(SELF_ID, [], undefined, 10);
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, 1, 2);

      recorder.getCurrentTick.mockReturnValue(16); // 10 + routeTimeout(5) + 1
      recorder.record.mockClear();

      module.processTick();

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.DeleteRoute,
        expect.anything(),
        RoutingProtocol.DSDV,
      );
      expect(module.getTables().DSDV_ROUTING_TABLE).toHaveLength(0);
    });

    it("does not expire routes that are still within the timeout window", () => {
      const { module, recorder } = makeModule(SELF_ID, [], undefined, 10);
      asInternal(module).routingTable.insert(REMOTE_ID, NEIGHBOUR_ID, 1, 2);

      recorder.getCurrentTick.mockReturnValue(12); // before timeout
      recorder.record.mockClear();

      module.processTick();

      const hasDeleteRoute = recorder.record.mock.calls.some((c) => c[1] === EventType.DeleteRoute);
      expect(hasDeleteRoute).toBe(false);
      expect(module.getTables().DSDV_ROUTING_TABLE).toHaveLength(1);
    });
  });

  describe("read (integration with BaseModule)", () => {
    it("returns false when peer is inactive", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const module = new DsdvModule(SELF_ID, makeGraph(selfPeer), makeEventRecorder());
      module.init();
      expect(module.read(makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, []))).toBe(false);
    });

    it("returns false for messages not in INCOMING_MESSAGE_TYPES", () => {
      const { module } = makeModule();
      expect(
        module.read({ type: MessageType.BatmanEchoLocationMessage } as unknown as Message),
      ).toBe(false);
    });

    it("dispatches DsdvRouteUpdateMessage to processRouteUpdate via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as DsdvModuleTestAccess, "processRouteUpdate");
      const msg = makeRouteUpdate(NEIGHBOUR_ID, NEIGHBOUR_ID, []);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });
  });
});
