import { OlsrModule } from "@/features/processor/module/olsr/OlsrModule";
import { MultipointRelaySelectorSet } from "@/features/processor/module/olsr/structures/MultipointRelaySelectorSet";
import { RoutingStructure } from "@/features/processor/types/module";
import type { Peer } from "@/features/processor/types/network/peer";
import {
  OlsrNeighbourStatus,
  type OlsrHelloMessage,
  type OlsrTcMessage,
} from "@/features/processor/types/protocols/olsr";
import { OLSR_DEFAULT_CONFIGURATION, OLSR_DEFAULT_TC_TTL } from "@/shared/constants/protocols/olsr";
import { DropReason, EventType } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import { generateUUID, type UUID } from "@/shared/types/common/uuid";
import type { OlsrConfiguration } from "@/shared/types/model/configurations";
import { RefreshAction } from "@/shared/types/model/steps";
import { describe, expect, it, jest } from "@jest/globals";
import { makeEventRecorder, makeGraph, makePeer as makePeerBase } from "../helpers";

const SELF_ID: UUID = generateUUID();
const NEIGHBOUR_ID: UUID = generateUUID();
const REMOTE_ID: UUID = generateUUID();

const DEFAULT_CONFIG: OlsrConfiguration = { ...OLSR_DEFAULT_CONFIGURATION };

function makePeer(id: UUID, active = true, config: OlsrConfiguration = DEFAULT_CONFIG): Peer {
  return makePeerBase(id, RoutingProtocol.OLSR, config, active);
}

function makeHello(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  neighbours: UUID[],
  mprPeerIds: UUID[] = [],
  overrides: Partial<OlsrHelloMessage> = {},
): OlsrHelloMessage {
  return {
    type: MessageType.OlsrHelloMessage,
    sourcePeerId,
    senderPeerId,
    interval: DEFAULT_CONFIG.helloInterval,
    neighbours,
    mprPeerIds,
    ...overrides,
  };
}

function makeTc(
  sourcePeerId: UUID,
  senderPeerId: UUID,
  advertisedNeighbours: UUID[],
  ansn = 1,
  overrides: Partial<OlsrTcMessage> = {},
): OlsrTcMessage {
  return {
    type: MessageType.OlsrTcMessage,
    sourcePeerId,
    senderPeerId,
    ansn,
    timeToLive: OLSR_DEFAULT_TC_TTL,
    advertisedNeighbours,
    ...overrides,
  };
}

function makeModule(peerId = SELF_ID, peers: Peer[] = [], config?: OlsrConfiguration, tick = 10) {
  const selfPeer = makePeer(peerId, true, config ?? DEFAULT_CONFIG);
  const recorder = makeEventRecorder(tick);
  const graph = makeGraph(selfPeer, peers);
  const module = new OlsrModule(peerId, graph, recorder);
  module.init();
  return { module, selfPeer, recorder, graph };
}

type OlsrModuleTestAccess = {
  process(message: Message): boolean;
  processHello(message: OlsrHelloMessage): boolean;
  processTransactionControl(message: OlsrTcMessage): boolean;
  mprSelectorSet: MultipointRelaySelectorSet;
};

function asInternal(module: OlsrModule): OlsrModuleTestAccess {
  return module as unknown as OlsrModuleTestAccess;
}

describe("OLSR module", () => {
  describe("initialization", () => {
    it("initialises without error", () => {
      expect(() => makeModule()).not.toThrow();
    });

    it("getTables returns empty structures initially", () => {
      const { module } = makeModule();
      const tables = module.getTables();
      expect(tables[RoutingStructure.OlsrNeighbourSet]).toEqual([]);
      expect(tables[RoutingStructure.OlsrTwoHopNeighbourSet]).toEqual([]);
      expect(tables[RoutingStructure.OlsrMultipointRelaySet]).toEqual([]);
      expect(tables[RoutingStructure.OlsrSelectorSet]).toEqual([]);
      expect(tables[RoutingStructure.OlsrTopologySet]).toEqual([]);
      expect(tables[RoutingStructure.OlsrRoutingTable]).toEqual([]);
    });
  });

  describe("process – unrecognised message type", () => {
    it("returns false for an unhandled message type", () => {
      const { module } = makeModule();
      const result = asInternal(module).process({ type: MessageType.Packet } as unknown as Message);
      expect(result).toBe(false);
    });
  });

  describe("processHello", () => {
    it("ignores HELLO from self and returns true without modifying state", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processHello(makeHello(SELF_ID, SELF_ID, []));
      expect(result).toBe(true);
      expect(recorder.record).not.toHaveBeenCalled();
      expect(module.getTables()[RoutingStructure.OlsrNeighbourSet]).toHaveLength(0);
    });

    it("adds sender to NeighbourSet with Symmetric status and fires AddRoute", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, []));

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.AddRoute,
        expect.anything(),
        RoutingProtocol.OLSR,
      );
      const neighbours = module.getTables()[RoutingStructure.OlsrNeighbourSet];
      expect(neighbours).toHaveLength(1);
      expect(neighbours[0].neighbourPeerId).toBe(NEIGHBOUR_ID);
      expect(neighbours[0].status).toBe(OlsrNeighbourStatus.Symmetric);
    });

    it("marks sender as MultipointRelay when self is included in mprPeerIds", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [], [SELF_ID]));

      const neighbours = module.getTables()[RoutingStructure.OlsrNeighbourSet];
      expect(neighbours[0].status).toBe(OlsrNeighbourStatus.MultipointRelay);
    });

    it("adds sender to mprSelectorSet when self is included in mprPeerIds", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [], [SELF_ID]));

      const selectors = module.getTables()[RoutingStructure.OlsrSelectorSet];
      expect(selectors).toHaveLength(1);
      expect(selectors[0].selectorPeerId).toBe(NEIGHBOUR_ID);
    });

    it("adds two-hop neighbours, excluding self, sender, and existing one-hop peers", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(
        makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [SELF_ID, NEIGHBOUR_ID, REMOTE_ID]),
      );

      const twoHop = module.getTables()[RoutingStructure.OlsrTwoHopNeighbourSet];
      expect(twoHop).toHaveLength(1);
      expect(twoHop[0].destinationPeerId).toBe(REMOTE_ID);
      expect(twoHop[0].viaPeerId).toBe(NEIGHBOUR_ID);
    });

    it("recomputes routing table when two-hop neighbours are added", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID]));

      const routes = module.getTables()[RoutingStructure.OlsrRoutingTable];
      const destIds = routes.map((r) => r.destinationPeerId);
      expect(destIds).toContain(NEIGHBOUR_ID);
      expect(destIds).toContain(REMOTE_ID);
    });
  });

  describe("processTransactionControl", () => {
    it("ignores TC from self and returns true without modifying topology", () => {
      const { module, recorder } = makeModule();
      const result = asInternal(module).processTransactionControl(
        makeTc(SELF_ID, SELF_ID, [REMOTE_ID]),
      );
      expect(result).toBe(true);
      expect(recorder.record).not.toHaveBeenCalled();
      expect(module.getTables()[RoutingStructure.OlsrTopologySet]).toHaveLength(0);
    });

    it("adds topology records to TopologySet", () => {
      const { module } = makeModule();
      asInternal(module).processTransactionControl(makeTc(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID]));

      const topology = module.getTables()[RoutingStructure.OlsrTopologySet];
      expect(topology).toHaveLength(1);
      expect(topology[0].destinationPeerId).toBe(REMOTE_ID);
      expect(topology[0].lastHopPeerId).toBe(NEIGHBOUR_ID);
    });

    it("recomputes routing table via topology when last-hop peer is a known neighbour", () => {
      const { module } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      // establish one-hop neighbour without adding two-hop (no routing recompute from HELLO alone)
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, []));
      asInternal(module).processTransactionControl(makeTc(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID]));

      const routes = module.getTables()[RoutingStructure.OlsrRoutingTable];
      const remote = routes.find((r) => r.destinationPeerId === REMOTE_ID);
      expect(remote).toBeDefined();
      expect(remote?.nextHopPeerId).toBe(NEIGHBOUR_ID);
    });

    it("ignores TC with outdated ANSN and preserves existing topology", () => {
      const { module } = makeModule();
      asInternal(module).processTransactionControl(
        makeTc(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID], 5),
      );
      expect(module.getTables()[RoutingStructure.OlsrTopologySet]).toHaveLength(1);

      asInternal(module).processTransactionControl(makeTc(NEIGHBOUR_ID, NEIGHBOUR_ID, [], 3));
      expect(module.getTables()[RoutingStructure.OlsrTopologySet]).toHaveLength(1);
    });

    it("rebroadcasts TC when mprSelectorSet is non-empty and TTL > 1", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).mprSelectorSet.add(NEIGHBOUR_ID, 10);

      asInternal(module).processTransactionControl(
        makeTc(REMOTE_ID, REMOTE_ID, [NEIGHBOUR_ID], 1, { timeToLive: 2 }),
      );

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({ retransmit: true }),
        RoutingProtocol.OLSR,
      );
    });

    it("does not rebroadcast TC when TTL is 1", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).mprSelectorSet.add(NEIGHBOUR_ID, 10);

      asInternal(module).processTransactionControl(
        makeTc(REMOTE_ID, REMOTE_ID, [NEIGHBOUR_ID], 1, { timeToLive: 1 }),
      );

      const hasBroadcast = recorder.record.mock.calls.some((c) => c[1] === EventType.Broadcast);
      expect(hasBroadcast).toBe(false);
    });
  });

  describe("getRoute", () => {
    it("returns null when no route exists", () => {
      const { module } = makeModule();
      expect(module.getRoute(REMOTE_ID)).toBeNull();
    });

    it("returns nextHopPeerId and fires GetRoute event when route exists", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID]));
      recorder.record.mockClear();

      const hop = module.getRoute(REMOTE_ID);
      expect(hop).toBe(NEIGHBOUR_ID);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.GetRoute,
        expect.objectContaining({ destinationPeerId: REMOTE_ID }),
        RoutingProtocol.OLSR,
      );
    });
  });

  describe("processRefresh Hello", () => {
    it("broadcasts HELLO message with current neighbour list", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      module.refresh(RefreshAction.OlsrHello);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({ retransmit: false }),
        RoutingProtocol.OLSR,
      );
    });
  });

  describe("processRefresh TC", () => {
    it("fires Drop(Skip) when mprSelectorSet is empty", () => {
      const { module, recorder } = makeModule();
      module.refresh(RefreshAction.OlsrTc);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Skip }),
        RoutingProtocol.OLSR,
      );
    });

    it("broadcasts TC message and increments ANSN when mprSelectorSet is non-empty", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).mprSelectorSet.add(NEIGHBOUR_ID, 10);

      module.refresh(RefreshAction.OlsrTc);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.objectContaining({ retransmit: false }),
        RoutingProtocol.OLSR,
      );
    });
  });

  describe("processTick", () => {
    it("expires stale neighbour entries and fires DeleteRoute for removed routes", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID]));
      expect(module.getTables()[RoutingStructure.OlsrNeighbourSet]).toHaveLength(1);
      expect(module.getTables()[RoutingStructure.OlsrRoutingTable].length).toBeGreaterThan(0);

      recorder.getCurrentTick.mockReturnValue(16); // 10 + routeTimeout(5) + 1
      recorder.record.mockClear();
      module.processTick();

      expect(module.getTables()[RoutingStructure.OlsrNeighbourSet]).toHaveLength(0);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.DeleteRoute,
        expect.anything(),
        RoutingProtocol.OLSR,
      );
    });

    it("does not expire entries within the timeout window", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(NEIGHBOUR_ID)]);
      asInternal(module).processHello(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, [REMOTE_ID]));

      recorder.getCurrentTick.mockReturnValue(14); // 10 + 4 < timeout
      module.processTick();

      expect(module.getTables()[RoutingStructure.OlsrNeighbourSet]).toHaveLength(1);
      expect(module.getTables()[RoutingStructure.OlsrRoutingTable].length).toBeGreaterThan(0);
    });
  });

  describe("read (integration with BaseModule)", () => {
    it("returns false for inactive peer", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const module = new OlsrModule(SELF_ID, makeGraph(selfPeer), makeEventRecorder());
      module.init();
      expect(module.read(makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, []))).toBe(false);
    });

    it("returns false for unhandled message type", () => {
      const { module } = makeModule();
      expect(module.read({ type: MessageType.Packet } as unknown as Message)).toBe(false);
    });

    it("dispatches OlsrHelloMessage to processHello via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(module as unknown as OlsrModuleTestAccess, "processHello");
      const msg = makeHello(NEIGHBOUR_ID, NEIGHBOUR_ID, []);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches OlsrTcMessage to processTransactionControl via read", () => {
      const { module } = makeModule();
      const spy = jest.spyOn(
        module as unknown as OlsrModuleTestAccess,
        "processTransactionControl",
      );
      const msg = makeTc(NEIGHBOUR_ID, NEIGHBOUR_ID, []);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });
  });
});
