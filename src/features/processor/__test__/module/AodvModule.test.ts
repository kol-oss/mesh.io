import { AodvModule } from "@/features/processor/module/aodv/AodvModule";
import { RouteRequestCache } from "@/features/processor/module/aodv/structures/RouteRequestCache";
import { RoutingTable } from "@/features/processor/module/aodv/structures/RoutingTable";
import { RoutingStructure } from "@/features/processor/types/module";
import type { Peer } from "@/features/processor/types/network/peer";
import type {
  AodvHelloMessage,
  AodvRouteErrorMessage,
  AodvRouteReplyMessage,
  AodvRouteRequestMessage,
} from "@/features/processor/types/protocols/aodv";
import {
  AODV_DEFAULT_CONFIGURATION,
  AODV_PATH_DISCOVERY_TTL,
  AODV_SEQUENCE_INITIAL,
} from "@/shared/constants/protocols/aodv";
import { DropReason, EventType } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import type { AodvConfiguration } from "@/shared/types/model/configurations";
import { describe, expect, it, jest } from "@jest/globals";
import { makeEventRecorder, makeGraph, makePeer as makePeerBase } from "../helpers";

const SELF_ID: UUID = generateUUID();
const NEIGHBOUR_ID: UUID = generateUUID();
const REMOTE_ID: UUID = generateUUID();
const FAR_ID: UUID = generateUUID();

const DEFAULT_CONFIG: AodvConfiguration = { ...AODV_DEFAULT_CONFIGURATION };

function makePeer(id: UUID, active = true, config: AodvConfiguration = DEFAULT_CONFIG): Peer {
  return makePeerBase(id, RoutingProtocol.AODV, config, active);
}

function makeRreq(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  destinationPeerId: UUID,
  overrides: Partial<AodvRouteRequestMessage> = {},
): AodvRouteRequestMessage {
  return {
    type: MessageType.AodvRouteRequestMessage,
    sourcePeerId,
    senderPeerId,
    destinationPeerId,
    requestId: 1,
    hopCount: 0,
    destinationSequenceNumber: null,
    originatorSequenceNumber: AODV_SEQUENCE_INITIAL,
    ...overrides,
  };
}

function makeRrep(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  originatorPeerId: UUID,
  destinationPeerId: UUID,
  targetPeerId: UUID,
  overrides: Partial<AodvRouteReplyMessage> = {},
): AodvRouteReplyMessage {
  return {
    type: MessageType.AodvRouteReplyMessage,
    sourcePeerId,
    senderPeerId,
    targetPeerId,
    destinationPeerId,
    destinationSequenceNumber: AODV_SEQUENCE_INITIAL,
    originatorPeerId,
    hopCount: 0,
    lifetime: DEFAULT_CONFIG.routeTimeout,
    gratuitous: false,
    ...overrides,
  };
}

function makeHello(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  overrides: Partial<AodvHelloMessage> = {},
): AodvHelloMessage {
  return {
    type: MessageType.AodvHelloMessage,
    sourcePeerId,
    senderPeerId,
    destinationSequenceNumber: AODV_SEQUENCE_INITIAL,
    lifetime: DEFAULT_CONFIG.routeTimeout,
    interval: DEFAULT_CONFIG.helloInterval,
    ...overrides,
  };
}

function makeRerr(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  destinationPeerId: UUID,
  sequenceNumber = AODV_SEQUENCE_INITIAL,
  overrides: Partial<AodvRouteErrorMessage> = {},
): AodvRouteErrorMessage {
  return {
    type: MessageType.AodvRouteErrorMessage,
    sourcePeerId,
    senderPeerId,
    targetPeerId: null,
    unreachableDestinations: [{ destinationPeerId, sequenceNumber }],
    noDelete: false,
    ...overrides,
  };
}

function makeModule(peerId = SELF_ID, peers: Peer[] = [], config?: AodvConfiguration, tick = 10) {
  const selfPeer = makePeer(peerId, true, config ?? DEFAULT_CONFIG);
  const recorder = makeEventRecorder(tick);
  const graph = makeGraph(selfPeer, peers);
  const module = new AodvModule(peerId, graph, recorder);
  module.init();
  return { module, selfPeer, recorder, graph };
}

type AodvModuleTestAccess = {
  process(message: Message): boolean;
  processRouteRequest(message: AodvRouteRequestMessage): boolean;
  processRouteReply(message: AodvRouteReplyMessage): boolean;
  processHello(message: AodvHelloMessage): boolean;
  processRouteError(message: AodvRouteErrorMessage): boolean;
  routingTable: RoutingTable;
  requestCache: RouteRequestCache;
};

function asInternal(module: AodvModule): AodvModuleTestAccess {
  return module as unknown as AodvModuleTestAccess;
}

describe("AODV module", () => {
  describe("initialization", () => {
    it("initialises without error", () => {
      expect(() => makeModule()).not.toThrow();
    });

    it("getTables returns empty routing table initially", () => {
      const { module } = makeModule();
      expect(module.getTables()[RoutingStructure.AodvRoutingTable]).toEqual([]);
    });
  });

  describe("process – unrecognised message type", () => {
    it("returns false for an unhandled message type", () => {
      const { module } = makeModule();
      const result = asInternal(module).process({
        type: MessageType.OlsrHelloMessage,
      } as unknown as Message);
      expect(result).toBe(false);
    });
  });

  describe("processHello", () => {
    it("installs a direct route to sender and returns true", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      const result = asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));

      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.AddRoute,
        expect.objectContaining({ destinationPeerId: NEIGHBOUR_ID }),
        RoutingProtocol.AODV,
      );
      const routes = module.getTables()[RoutingStructure.AodvRoutingTable];
      expect(routes).toHaveLength(1);
      expect(routes[0].nextHopId).toBe(NEIGHBOUR_ID);
    });

    it("updates an existing route on subsequent HELLO with same sequence", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));
      recorder.record.mockClear();

      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));

      // route already exists - adoption logic should accept since existing is same-hop
      expect(module.getTables()[RoutingStructure.AodvRoutingTable]).toHaveLength(1);
    });
  });

  describe("processRouteRequest (RREQ)", () => {
    it("drops Duplicate and returns true when RREQ already seen", () => {
      const { module, recorder } = makeModule();
      const msg = makeRreq(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID);
      asInternal(module).processRouteRequest(msg);
      recorder.record.mockClear();

      const result = asInternal(module).processRouteRequest(msg);
      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Duplicate }),
        RoutingProtocol.AODV,
      );
    });

    it("replies RREP when SELF is the destination", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteRequest(
        makeRreq(NEIGHBOUR_ID, NEIGHBOUR_ID, SELF_ID, { requestId: 2 }),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Calculation,
        expect.anything(),
        RoutingProtocol.AODV,
      );
    });

    it("rebroadcasts RREQ with incremented hopCount when no route to destination", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteRequest(makeRreq(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID));

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({ retransmit: true }),
        RoutingProtocol.AODV,
      );
    });

    it("drops RREQ with TTL exceeded instead of rebroadcasting", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteRequest(
        makeRreq(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID, {
          requestId: 3,
          hopCount: AODV_PATH_DISCOVERY_TTL,
        }),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.TimeToLiveExceeded }),
        RoutingProtocol.AODV,
      );
    });

    it("installs reverse route to RREQ originator", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processRouteRequest(makeRreq(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID));

      const routes = module.getTables()[RoutingStructure.AodvRoutingTable];
      const reverseRoute = routes.find((r) => r.destinationId === NEIGHBOUR_ID);
      expect(reverseRoute).toBeDefined();
      expect(reverseRoute?.nextHopId).toBe(NEIGHBOUR_ID);
    });
  });

  describe("processRouteReply (RREP)", () => {
    it("installs forward route and returns true when SELF is the originator", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      const result = asInternal(module).processRouteReply(
        makeRrep(NEIGHBOUR_ID, NEIGHBOUR_ID, SELF_ID, REMOTE_ID, SELF_ID),
      );

      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.AddRoute,
        expect.objectContaining({ destinationPeerId: REMOTE_ID }),
        RoutingProtocol.AODV,
      );
    });

    it("drops RREP with NoRoute when no reverse route to originator", () => {
      const { module, recorder } = makeModule();
      asInternal(module).processRouteReply(
        makeRrep(REMOTE_ID, REMOTE_ID, FAR_ID, NEIGHBOUR_ID, SELF_ID),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.NoRoute }),
        RoutingProtocol.AODV,
      );
    });

    it("forwards RREP toward originator when SELF is an intermediate hop", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      // establish reverse route to FAR_ID via NEIGHBOUR_ID
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));
      asInternal(module).processRouteRequest(
        makeRreq(FAR_ID, NEIGHBOUR_ID, REMOTE_ID, { requestId: 5 }),
      );
      recorder.record.mockClear();

      asInternal(module).processRouteReply(
        makeRrep(REMOTE_ID, REMOTE_ID, FAR_ID, REMOTE_ID, SELF_ID),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Calculation,
        expect.anything(),
        RoutingProtocol.AODV,
      );
    });
  });

  describe("processRouteError (RERR)", () => {
    it("returns true with no propagation when route via sender does not exist", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processRouteError(
        makeRerr(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID),
      );
      expect(result).toBe(true);
      expect(recorder.record).not.toHaveBeenCalled();
    });

    it("invalidates an existing route via the sender and fires UpdateRoute", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));
      // install a route to REMOTE_ID via NEIGHBOUR_ID
      asInternal(module).processRouteRequest(
        makeRreq(REMOTE_ID, NEIGHBOUR_ID, FAR_ID, { requestId: 6 }),
      );
      recorder.record.mockClear();

      asInternal(module).processRouteError(makeRerr(REMOTE_ID, NEIGHBOUR_ID, REMOTE_ID));

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.UpdateRoute,
        expect.objectContaining({ destinationPeerId: REMOTE_ID }),
        RoutingProtocol.AODV,
      );
      const route = asInternal(module).routingTable.get(REMOTE_ID);
      expect(route?.valid).toBe(false);
    });
  });

  describe("getRoute", () => {
    it("returns null when no route exists", () => {
      const { module } = makeModule();
      expect(module.getRoute(REMOTE_ID)).toBeNull();
    });

    it("returns nextHopId when a valid route exists", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));
      expect(module.getRoute(NEIGHBOUR_ID)).toBe(NEIGHBOUR_ID);
    });

    it("returns null for an invalidated route", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));
      asInternal(module).processRouteError(makeRerr(NEIGHBOUR_ID, NEIGHBOUR_ID, NEIGHBOUR_ID));
      expect(module.getRoute(NEIGHBOUR_ID)).toBeNull();
    });
  });

  describe("processRefresh (HELLO broadcast)", () => {
    it("broadcasts HELLO to all AODV neighbours", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      module.processRefresh();

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({
          retransmit: false,
          neighbourPeerIds: expect.arrayContaining([NEIGHBOUR_ID]),
        }),
        RoutingProtocol.AODV,
      );
    });

    it("does not broadcast when peer is inactive", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const recorder = makeEventRecorder();
      const module = new AodvModule(
        SELF_ID,
        makeGraph(selfPeer, [makePeer(NEIGHBOUR_ID)]),
        recorder,
      );
      module.init();
      module.processRefresh();

      expect(recorder.record).not.toHaveBeenCalled();
    });
  });

  describe("processTick", () => {
    it("removes expired routes and fires DeleteRoute", () => {
      const { module, recorder } = makeModule(
        SELF_ID,
        [makePeer(NEIGHBOUR_ID)],
        DEFAULT_CONFIG,
        10,
      );
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));

      recorder.getCurrentTick.mockReturnValue(10 + DEFAULT_CONFIG.routeTimeout);
      recorder.record.mockClear();

      module.processTick();

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.DeleteRoute,
        expect.objectContaining({ destinationPeerId: NEIGHBOUR_ID }),
        RoutingProtocol.AODV,
      );
      expect(module.getTables()[RoutingStructure.AodvRoutingTable]).toHaveLength(0);
    });

    it("does not remove routes within the timeout window", () => {
      const { module, recorder } = makeModule(
        SELF_ID,
        [makePeer(NEIGHBOUR_ID)],
        DEFAULT_CONFIG,
        10,
      );
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID));

      recorder.getCurrentTick.mockReturnValue(10 + DEFAULT_CONFIG.routeTimeout - 1);
      recorder.record.mockClear();

      module.processTick();

      const hasDelete = recorder.record.mock.calls.some((c) => c[1] === EventType.DeleteRoute);
      expect(hasDelete).toBe(false);
      expect(module.getTables()[RoutingStructure.AodvRoutingTable]).toHaveLength(1);
    });
  });

  describe("read (integration with BaseModule)", () => {
    it("returns false for inactive peer", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const module = new AodvModule(SELF_ID, makeGraph(selfPeer), makeEventRecorder());
      module.init();
      expect(module.read(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID))).toBe(false);
    });

    it("returns false for unhandled message type", () => {
      const { module } = makeModule();
      expect(module.read({ type: MessageType.OlsrTcMessage } as unknown as Message)).toBe(false);
    });

    it("dispatches AodvRouteRequestMessage to processRouteRequest via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as AodvModuleTestAccess, "processRouteRequest");
      const msg = makeRreq(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches AodvRouteReplyMessage to processRouteReply via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as AodvModuleTestAccess, "processRouteReply");
      const msg = makeRrep(NEIGHBOUR_ID, NEIGHBOUR_ID, SELF_ID, REMOTE_ID, SELF_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches AodvHelloMessage to processHello via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as AodvModuleTestAccess, "processHello");
      const msg = makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches AodvRouteErrorMessage to processRouteError via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as AodvModuleTestAccess, "processRouteError");
      const msg = makeRerr(NEIGHBOUR_ID, NEIGHBOUR_ID, REMOTE_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });
  });
});
