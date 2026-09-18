import { DsrModule } from "@/features/processor/module/dsr/DsrModule";
import { RouteCache } from "@/features/processor/module/dsr/structures/RouteCache";
import { RouteRequestTable } from "@/features/processor/module/dsr/structures/RouteRequestTable";
import { RoutingStructure } from "@/features/processor/types/module";
import type { Peer } from "@/features/processor/types/network/peer";
import type {
  DsrPacket,
  DsrRouteErrorMessage,
  DsrRouteReplyMessage,
  DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import { DSR_DEFAULT_CONFIGURATION, DSR_MAX_SALVAGE_COUNT } from "@/shared/constants/protocols/dsr";
import { DropReason, EventType } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import type { DsrConfiguration } from "@/shared/types/model/configurations";
import { describe, expect, it, jest } from "@jest/globals";
import { makeEventRecorder, makeGraph, makePeer as makePeerBase } from "../helpers";

const SELF_ID: UUID = generateUUID();
const NEIGHBOUR_ID: UUID = generateUUID();
const REMOTE_ID: UUID = generateUUID();
const FAR_ID: UUID = generateUUID();

const DEFAULT_CONFIG: DsrConfiguration = { ...DSR_DEFAULT_CONFIGURATION };

function makePeer(id: UUID, active = true, config: DsrConfiguration = DEFAULT_CONFIG): Peer {
  return makePeerBase(id, RoutingProtocol.DSR, config, active);
}

function makeRouteRequest(
  sourceId: UUID,
  destinationId: UUID,
  path: UUID[] = [],
  identification = 1,
  overrides: Partial<DsrRouteRequestMessage> = {},
): DsrRouteRequestMessage {
  return {
    type: MessageType.DsrRouteRequestMessage,
    sourceId,
    destinationId,
    path,
    identification,
    ...overrides,
  };
}

function makeRouteReply(
  sourceId: UUID,
  destinationId: UUID,
  path: UUID[],
  identification = 1,
  overrides: Partial<DsrRouteReplyMessage> = {},
): DsrRouteReplyMessage {
  return {
    type: MessageType.DsrRouteReplyMessage,
    sourceId,
    destinationId,
    path,
    identification,
    ...overrides,
  };
}

function makeRouteError(
  sourceId: UUID,
  destinationId: UUID,
  errorSourceId: UUID,
  errorDestinationId: UUID,
  salvageCount = DSR_MAX_SALVAGE_COUNT + 1,
  overrides: Partial<DsrRouteErrorMessage> = {},
): DsrRouteErrorMessage {
  return {
    type: MessageType.DsrRouteErrorMessage,
    sourceId,
    destinationId,
    errorSourceId,
    errorDestinationId,
    salvageCount,
    ...overrides,
  };
}

function makeDsrPacket(
  sourcePeerId: UUID,
  destinationPeerId: UUID,
  path: UUID[] = [],
  salvageCount = 0,
): DsrPacket {
  return {
    type: MessageType.DsrPacket,
    sourcePeerId,
    destinationPeerId,
    path,
    salvageCount,
    timeToLive: 50,
  };
}

function makeModule(peerId = SELF_ID, peers: Peer[] = [], config?: DsrConfiguration, tick = 10) {
  const selfPeer = makePeer(peerId, true, config ?? DEFAULT_CONFIG);
  const recorder = makeEventRecorder(tick);
  const graph = makeGraph(selfPeer, peers);
  const module = new DsrModule(peerId, graph, recorder);
  module.init();
  return { module, selfPeer, recorder, graph };
}

type DsrModuleTestAccess = {
  process(message: Message): boolean;
  processRouteRequest(message: DsrRouteRequestMessage): boolean;
  processRouteReply(message: DsrRouteReplyMessage): boolean;
  processRouteError(message: DsrRouteErrorMessage): boolean;
  processDsrPacket(packet: DsrPacket): boolean;
  cache: RouteCache;
  requestTable: RouteRequestTable;
};

function asInternal(module: DsrModule): DsrModuleTestAccess {
  return module as unknown as DsrModuleTestAccess;
}

describe("DSR module", () => {
  describe("initialization", () => {
    it("initialises without error", () => {
      expect(() => makeModule()).not.toThrow();
    });

    it("getTables returns empty structures initially", () => {
      const { module } = makeModule();
      const tables = module.getTables();
      expect(tables[RoutingStructure.DsrRoutingCache]).toEqual([]);
      expect(tables[RoutingStructure.DsrRouteRequestTable]).toEqual([]);
    });
  });

  describe("process – unrecognised message type", () => {
    it("returns false for an unhandled message type", () => {
      const { module } = makeModule();
      const result = asInternal(module).process({ type: MessageType.Packet } as unknown as Message);
      expect(result).toBe(false);
    });
  });

  describe("processRouteRequest (RREQ)", () => {
    it("drops and returns true on duplicate identification", () => {
      const { module, recorder } = makeModule();
      const msg = makeRouteRequest(NEIGHBOUR_ID, REMOTE_ID, [], 1);
      asInternal(module).processRouteRequest(msg);
      recorder.record.mockClear();

      const result = asInternal(module).processRouteRequest(msg);
      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Duplicate }),
        RoutingProtocol.DSR,
      );
    });

    it("silently returns true when SELF is the source (own RREQ echo)", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processRouteRequest(
        makeRouteRequest(SELF_ID, REMOTE_ID, [], 99),
      );
      expect(result).toBe(true);
      expect(recorder.record).not.toHaveBeenCalled();
    });

    it("drops Duplicate when SELF already appears in path (cycle detection)", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processRouteRequest(
        makeRouteRequest(NEIGHBOUR_ID, REMOTE_ID, [SELF_ID], 2),
      );
      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Duplicate }),
        RoutingProtocol.DSR,
      );
    });

    it("sends RREP when SELF is the destination", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      const result = asInternal(module).processRouteRequest(
        makeRouteRequest(NEIGHBOUR_ID, SELF_ID, [NEIGHBOUR_ID], 1),
      );
      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Calculation,
        expect.objectContaining({ isFromCache: false }),
        RoutingProtocol.DSR,
      );
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        RoutingProtocol.DSR,
      );
    });

    it("replies from cache when a route to destination is cached", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).cache.insert(REMOTE_ID, [NEIGHBOUR_ID]);
      recorder.record.mockClear();

      asInternal(module).processRouteRequest(
        makeRouteRequest(NEIGHBOUR_ID, REMOTE_ID, [NEIGHBOUR_ID], 3),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Calculation,
        expect.objectContaining({ isFromCache: true }),
        RoutingProtocol.DSR,
      );
    });

    it("rebroadcasts RREQ appending self to path when no cached route", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteRequest(
        makeRouteRequest(NEIGHBOUR_ID, REMOTE_ID, [NEIGHBOUR_ID], 4),
      );
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({ retransmit: true }),
        RoutingProtocol.DSR,
      );
    });
  });

  describe("processRouteReply (RREP)", () => {
    it("drops and returns true when SELF is the source (SourceIsTarget)", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processRouteReply(
        makeRouteReply(SELF_ID, NEIGHBOUR_ID, [NEIGHBOUR_ID]),
      );
      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.SourceIsTarget }),
        RoutingProtocol.DSR,
      );
    });

    it("inserts route and fires AddRoute when SELF is the destination", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processRouteReply(
        makeRouteReply(NEIGHBOUR_ID, SELF_ID, [NEIGHBOUR_ID]),
      );
      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.AddRoute,
        expect.objectContaining({ destinationId: NEIGHBOUR_ID }),
        RoutingProtocol.DSR,
      );
      expect(module.getTables()[RoutingStructure.DsrRoutingCache]).toHaveLength(1);
    });

    it("forwards RREP to next hop when SELF is in path but not destination", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteReply(
        makeRouteReply(REMOTE_ID, FAR_ID, [SELF_ID, NEIGHBOUR_ID]),
      );
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({ retransmit: false }),
        RoutingProtocol.DSR,
      );
    });

    it("silently returns true when SELF is not in path and not destination", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processRouteReply(
        makeRouteReply(NEIGHBOUR_ID, FAR_ID, [REMOTE_ID]),
      );
      expect(result).toBe(true);
      expect(recorder.record).not.toHaveBeenCalled();
    });
  });

  describe("processRouteError (RERR)", () => {
    it("removes broken link from cache", () => {
      const { module } = makeModule();
      asInternal(module).cache.insert(REMOTE_ID, [NEIGHBOUR_ID, REMOTE_ID]);

      asInternal(module).processRouteError(
        makeRouteError(FAR_ID, REMOTE_ID, NEIGHBOUR_ID, REMOTE_ID),
      );

      expect(module.getTables()[RoutingStructure.DsrRoutingCache]).toHaveLength(0);
    });

    it("returns false when SELF is source and salvage count exceeded", () => {
      const { module } = makeModule();
      const result = asInternal(module).processRouteError(
        makeRouteError(SELF_ID, REMOTE_ID, SELF_ID, NEIGHBOUR_ID, DSR_MAX_SALVAGE_COUNT + 1),
      );
      expect(result).toBe(false);
    });
  });

  describe("processDsrPacket", () => {
    it("returns true when SELF is the destination", () => {
      const { module } = makeModule();
      const result = asInternal(module).processDsrPacket(makeDsrPacket(NEIGHBOUR_ID, SELF_ID, []));
      expect(result).toBe(true);
    });

    it("fires GetRoute and forwards packet when SELF is intermediate hop", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processDsrPacket(
        makeDsrPacket(REMOTE_ID, FAR_ID, [SELF_ID, NEIGHBOUR_ID]),
      );
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.GetRoute,
        expect.anything(),
        RoutingProtocol.DSR,
      );
    });
  });

  describe("getRoute", () => {
    it("returns null and broadcasts RREQ when no route cached", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      const hop = module.getRoute(REMOTE_ID);

      expect(hop).toBeNull();
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        RoutingProtocol.DSR,
      );
    });

    it("returns first hop and fires GetRoute when direct route cached", () => {
      const { module, recorder } = makeModule();
      asInternal(module).cache.insert(REMOTE_ID, [NEIGHBOUR_ID]);
      recorder.record.mockClear();

      const hop = module.getRoute(REMOTE_ID);
      expect(hop).toBe(NEIGHBOUR_ID);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.GetRoute,
        expect.objectContaining({ destinationPeerId: REMOTE_ID }),
        RoutingProtocol.DSR,
      );
    });

    it("returns destination directly when cached path is empty", () => {
      const { module } = makeModule();
      asInternal(module).cache.insert(REMOTE_ID, []);
      expect(module.getRoute(REMOTE_ID)).toBe(REMOTE_ID);
    });
  });

  describe("processTick", () => {
    it("expires cached routes beyond routeTimeout and fires DeleteRoute", () => {
      const { module, recorder } = makeModule(SELF_ID, [], DEFAULT_CONFIG, 10);
      asInternal(module).cache.insert(REMOTE_ID, [NEIGHBOUR_ID]);

      recorder.getCurrentTick.mockReturnValue(10 + DEFAULT_CONFIG.routeTimeout);
      recorder.record.mockClear();

      module.processTick();

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.DeleteRoute,
        expect.anything(),
        RoutingProtocol.DSR,
      );
      expect(module.getTables()[RoutingStructure.DsrRoutingCache]).toHaveLength(0);
    });

    it("does not expire routes within the timeout window", () => {
      const { module, recorder } = makeModule(SELF_ID, [], DEFAULT_CONFIG, 10);
      asInternal(module).cache.insert(REMOTE_ID, [NEIGHBOUR_ID]);

      recorder.getCurrentTick.mockReturnValue(10 + DEFAULT_CONFIG.routeTimeout - 1);
      recorder.record.mockClear();

      module.processTick();

      const hasDelete = recorder.record.mock.calls.some((c) => c[1] === EventType.DeleteRoute);
      expect(hasDelete).toBe(false);
      expect(module.getTables()[RoutingStructure.DsrRoutingCache]).toHaveLength(1);
    });
  });

  describe("read (integration with BaseModule)", () => {
    it("returns false for inactive peer", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const module = new DsrModule(SELF_ID, makeGraph(selfPeer), makeEventRecorder());
      module.init();
      expect(module.read(makeRouteRequest(NEIGHBOUR_ID, REMOTE_ID, [], 1))).toBe(false);
    });

    it("returns false for unhandled message type", () => {
      const { module } = makeModule();
      expect(module.read({ type: MessageType.OlsrHelloMessage } as unknown as Message)).toBe(false);
    });

    it("dispatches DsrRouteRequestMessage to processRouteRequest via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as DsrModuleTestAccess, "processRouteRequest");
      const msg = makeRouteRequest(NEIGHBOUR_ID, REMOTE_ID, [], 5);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches DsrRouteReplyMessage to processRouteReply via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as DsrModuleTestAccess, "processRouteReply");
      const msg = makeRouteReply(NEIGHBOUR_ID, SELF_ID, [NEIGHBOUR_ID]);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches DsrRouteErrorMessage to processRouteError via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as DsrModuleTestAccess, "processRouteError");
      const msg = makeRouteError(NEIGHBOUR_ID, REMOTE_ID, NEIGHBOUR_ID, REMOTE_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });
  });
});
