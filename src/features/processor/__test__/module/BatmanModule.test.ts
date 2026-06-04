import { BatmanModule } from "@/features/processor/module/batman/BatmanModule";
import { NeighbourList } from "@/features/processor/module/batman/structures/NeighbourList";
import type { NetworkGraph } from "@/features/processor/types/network/graph";
import { LinkType } from "@/features/processor/types/network/link";
import type { Peer } from "@/features/processor/types/network/peer";
import type {
  BatmanCalculationEventDetails,
  BatmanEchoLocationMessage,
  BatmanOriginatorMessage,
} from "@/features/processor/types/protocols/batman";
import type { EventRecorder } from "@/features/processor/types/recorder";
import {
  BATMAN_MAX_THROUGHPUT,
  BATMAN_TIME_TO_LIVE,
  BATMAN_VERSION,
  BATMAN_WIRED_BASE_THROUGHPUT,
  BATMAN_WIRELESS_BASE_THROUGHPUT,
} from "@/shared/constants/protocols/batman";
import { DropReason, EventType } from "@/shared/types/common/events";
import { MessageType, type Message } from "@/shared/types/common/messages";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { BatmanConfiguration } from "@/shared/types/model/configurations";
import { RefreshAction } from "@/shared/types/model/steps";
import { describe, expect, it, jest } from "@jest/globals";
import { generateUUID, type UUID } from "@/shared/types/common/uuid.ts";

const SELF_ID: UUID = generateUUID();
const FIRST_NEIGHBOUR_ID: UUID = generateUUID();
const SECOND_NEIGHBOUR_ID: UUID = generateUUID();
const REMOTE_ID: UUID = generateUUID();

const DEFAULT_CONFIG: BatmanConfiguration = {
  penaltyDistance: 100,
  penaltyPercent: 10,
  elpInterval: 5,
  ogmInterval: 5,
  purgeTimeout: 10,
};

function makePeer(id: string, active = true, config: BatmanConfiguration = DEFAULT_CONFIG): Peer {
  return {
    id,
    name: id,
    active,
    protocol: RoutingProtocol.BATMAN,
    coordinates: { x: 0, y: 0 },
    range: 200,
    configuration: config,
    module: {
      read: jest.fn<() => boolean>().mockReturnValue(true),
      send: jest.fn<() => boolean>().mockReturnValue(true),
      refresh: jest.fn<() => void>(),
    },
  };
}

function makeElpMessage(
  sourceId: string,
  senderId: string,
  overrides: Partial<BatmanEchoLocationMessage> = {},
): BatmanEchoLocationMessage {
  return {
    type: MessageType.BatmanEchoLocationMessage,
    version: BATMAN_VERSION,
    sourceId,
    senderId,
    timeToLive: BATMAN_TIME_TO_LIVE,
    numNeighbours: 0,
    sequence: 1,
    interval: DEFAULT_CONFIG.elpInterval,
    neighbours: [],
    ...overrides,
  };
}

function makeOgmMessage(
  sourceId: string,
  senderId: string,
  overrides: Partial<BatmanOriginatorMessage> = {},
): BatmanOriginatorMessage {
  return {
    type: MessageType.BatmanOriginatorMessage,
    version: BATMAN_VERSION,
    sourceId,
    senderId,
    sequence: 1,
    timeToLive: BATMAN_TIME_TO_LIVE,
    throughput: BATMAN_MAX_THROUGHPUT,
    ...overrides,
  };
}

function makeEventRecorder(tick = 10): jest.Mocked<EventRecorder> {
  return {
    record: jest.fn<EventRecorder["record"]>(),
    setStep: jest.fn<EventRecorder["setStep"]>(),
    setListener: jest.fn<EventRecorder["setListener"]>(),
    getEvents: jest.fn<EventRecorder["getEvents"]>().mockReturnValue([]),
    getCurrentTick: jest.fn<EventRecorder["getCurrentTick"]>().mockReturnValue(tick),
  };
}

function makeGraph(selfPeer: Peer, neighbours: Peer[] = []): jest.Mocked<NetworkGraph> {
  return {
    getNode: jest.fn((id: string) => {
      if (id === selfPeer.id) return selfPeer;
      const found = neighbours.find((p) => p.id === id);
      if (!found) throw new Error(`Peer ${id} not found`);
      return found;
    }) as jest.Mocked<NetworkGraph>["getNode"],
    getNeighbours: jest.fn(() => neighbours) as jest.Mocked<NetworkGraph>["getNeighbours"],
    hasLink: jest.fn<NetworkGraph["hasLink"]>().mockReturnValue(false),
    init: jest.fn<NetworkGraph["init"]>(),
    moveNode: jest.fn<NetworkGraph["moveNode"]>(),
    setStatus: jest.fn<NetworkGraph["setStatus"]>().mockReturnValue(null),
    snapshot: jest.fn<NetworkGraph["snapshot"]>(),
    peerTables: jest.fn<NetworkGraph["peerTables"]>().mockReturnValue([]),
  };
}

function makeModule(peerId = SELF_ID, peers: Peer[] = [], config?: BatmanConfiguration, tick = 10) {
  const selfPeer = makePeer(peerId, true, config ?? DEFAULT_CONFIG);
  const recorder = makeEventRecorder(tick);
  const graph = makeGraph(selfPeer, peers);
  const module = new BatmanModule(peerId, graph, recorder);
  module.init();
  return { module, selfPeer, recorder, graph };
}

type BatmanModuleTestAccess = {
  process(message: Message): boolean;
  processEchoLocation(message: BatmanEchoLocationMessage): boolean;
  processOriginatorMessage(message: BatmanOriginatorMessage): boolean;
  neighbourList: NeighbourList;
};

function asInternal(module: BatmanModule): BatmanModuleTestAccess {
  return module as unknown as BatmanModuleTestAccess;
}

describe("B.A.T.M.A.N. V module", () => {
  describe("initialization", () => {
    it("initialises without error", () => {
      expect(() => makeModule()).not.toThrow();
    });

    it("getTables returns empty neighbour list and originator table initially", () => {
      const { module } = makeModule();
      const tables = module.getTables();

      expect(tables.BATMAN_NEIGHBOURS_LIST).toEqual([]);
      expect(tables.BATMAN_ORIGINATOR_TABLE).toEqual([]);
    });
  });

  describe("process – unrecognised message type", () => {
    it("returns false for an unhandled message type", () => {
      const { module } = makeModule();
      const result = asInternal(module).process({ type: MessageType.Packet } as unknown as Message);

      expect(result).toBe(false);
    });
  });

  describe("processEchoLocation (ELP)", () => {
    it("returns true and skips processing when sourceId equals self", () => {
      const { module, recorder } = makeModule();
      const msg = makeElpMessage(SELF_ID, FIRST_NEIGHBOUR_ID);
      const result = asInternal(module).processEchoLocation(msg);

      expect(result).toBe(true);
      expect(recorder.record).not.toHaveBeenCalled();
    });

    it("drops message and returns false when timeToLive is 0", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      const msg = makeElpMessage(FIRST_NEIGHBOUR_ID, FIRST_NEIGHBOUR_ID, { timeToLive: 0 });
      const result = asInternal(module).processEchoLocation(msg);

      expect(result).toBe(false);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.TimeToLiveExceeded }),
        undefined,
      );
    });

    it("records Calculation event and adds neighbour on wired link", () => {
      const { module, recorder, graph } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      graph.hasLink.mockImplementation((_src, _dst, type) => type === LinkType.Wired);

      const result = asInternal(module).processEchoLocation(
        makeElpMessage(FIRST_NEIGHBOUR_ID, FIRST_NEIGHBOUR_ID),
      );

      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Calculation,
        expect.objectContaining({
          elpProcessing: expect.objectContaining({ linkThroughput: BATMAN_WIRED_BASE_THROUGHPUT }),
        }),
        RoutingProtocol.BATMAN,
      );
    });

    it("applies distance penalty on wireless link beyond penaltyDistance", () => {
      const config: BatmanConfiguration = {
        ...DEFAULT_CONFIG,
        penaltyDistance: 10,
        penaltyPercent: 50,
      };

      const neighbour = makePeer(FIRST_NEIGHBOUR_ID);
      neighbour.coordinates = { x: 100, y: 0 };

      const selfPeer = makePeer(SELF_ID, true, config);
      selfPeer.coordinates = { x: 0, y: 0 };

      const recorder = makeEventRecorder(10);
      const graph = makeGraph(selfPeer, [neighbour]);
      graph.hasLink.mockImplementation((_src, _dst, type) => type !== LinkType.Wired);

      const module = new BatmanModule(SELF_ID, graph, recorder);
      module.init();

      asInternal(module).processEchoLocation(
        makeElpMessage(FIRST_NEIGHBOUR_ID, FIRST_NEIGHBOUR_ID),
      );

      const details = recorder.record.mock.calls[0][2] as BatmanCalculationEventDetails;
      expect(details.elpProcessing?.newThroughput).toBeLessThan(BATMAN_WIRELESS_BASE_THROUGHPUT);
    });

    it("stores neighbour record after processing ELP", () => {
      const { module, graph } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      graph.hasLink.mockReturnValue(true);

      asInternal(module).processEchoLocation(
        makeElpMessage(FIRST_NEIGHBOUR_ID, FIRST_NEIGHBOUR_ID),
      );

      expect(module.getTables().BATMAN_NEIGHBOURS_LIST).toHaveLength(1);
      expect(module.getTables().BATMAN_NEIGHBOURS_LIST[0].neighbourId).toBe(FIRST_NEIGHBOUR_ID);
    });
  });

  describe("processOriginatorMessage (OGM)", () => {
    function setupWithNeighbourInList(tick = 10) {
      const { module, recorder, graph } = makeModule(
        SELF_ID,
        [makePeer(FIRST_NEIGHBOUR_ID)],
        undefined,
        tick,
      );

      asInternal(module).neighbourList.put(FIRST_NEIGHBOUR_ID, {
        neighbourId: FIRST_NEIGHBOUR_ID,
        throughput: 80,
        lastTick: tick,
        interval: DEFAULT_CONFIG.elpInterval,
      });

      return { module, recorder, graph };
    }

    it("drops and returns true when sourceId equals self (SourceIsTarget)", () => {
      const { module, recorder } = setupWithNeighbourInList();
      const result = asInternal(module).processOriginatorMessage(
        makeOgmMessage(SELF_ID, FIRST_NEIGHBOUR_ID),
      );

      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.SourceIsTarget }),
        undefined,
      );
    });

    it("drops and returns true when TTL exhausted after decrement", () => {
      const { module, recorder } = setupWithNeighbourInList();
      const result = asInternal(module).processOriginatorMessage(
        makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID, { timeToLive: 1 }),
      );

      expect(result).toBe(true);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.TimeToLiveExceeded }),
        undefined,
      );
    });

    it("accepts new OGM, records Calculation event and updates originator table", () => {
      const { module, recorder } = setupWithNeighbourInList();
      asInternal(module).processOriginatorMessage(makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID));

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Calculation,
        expect.objectContaining({
          ogmProcessing: expect.objectContaining({ receivedThroughput: BATMAN_MAX_THROUGHPUT }),
        }),
        RoutingProtocol.BATMAN,
      );
      expect(module.getTables().BATMAN_ORIGINATOR_TABLE).toHaveLength(1);
    });

    it("drops duplicate OGM sequence (Duplicate)", () => {
      const { module, recorder } = setupWithNeighbourInList();
      const msg = makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID, { sequence: 1 });
      asInternal(module).processOriginatorMessage(msg);
      recorder.record.mockClear();

      asInternal(module).processOriginatorMessage(msg);

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Drop,
        expect.objectContaining({ reason: DropReason.Duplicate }),
        undefined,
      );
    });

    it("drops when route is not optimal (NotOptimalRoute)", () => {
      const { module, recorder } = makeModule(SELF_ID, [
        makePeer(FIRST_NEIGHBOUR_ID),
        makePeer(SECOND_NEIGHBOUR_ID),
      ]);

      asInternal(module).neighbourList.put(FIRST_NEIGHBOUR_ID, {
        neighbourId: FIRST_NEIGHBOUR_ID,
        throughput: 200,
        lastTick: 10,
        interval: DEFAULT_CONFIG.elpInterval,
      });

      asInternal(module).neighbourList.put(SECOND_NEIGHBOUR_ID, {
        neighbourId: SECOND_NEIGHBOUR_ID,
        throughput: 10,
        lastTick: 10,
        interval: DEFAULT_CONFIG.elpInterval,
      });

      asInternal(module).processOriginatorMessage(
        makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID, { sequence: 1 }),
      );
      recorder.record.mockClear();

      asInternal(module).processOriginatorMessage(
        makeOgmMessage(REMOTE_ID, SECOND_NEIGHBOUR_ID, { sequence: 2 }),
      );

      const dropCall = recorder.record.mock.calls.find((c) => c[1] === EventType.Drop);
      expect(dropCall).toBeDefined();
      expect(dropCall![2]).toMatchObject({ reason: DropReason.NotOptimalRoute });
    });
  });

  describe("getRoute", () => {
    it("returns null when no route exists", () => {
      const { module } = makeModule();
      expect(module.getRoute(REMOTE_ID)).toBeNull();
    });

    it("returns best hop id and records GetRoute event after OGM is learned", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      asInternal(module).neighbourList.put(FIRST_NEIGHBOUR_ID, {
        neighbourId: FIRST_NEIGHBOUR_ID,
        throughput: 100,
        lastTick: 10,
        interval: DEFAULT_CONFIG.elpInterval,
      });
      asInternal(module).processOriginatorMessage(makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID));

      recorder.record.mockClear();
      expect(module.getRoute(REMOTE_ID)).toBe(FIRST_NEIGHBOUR_ID);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.GetRoute,
        expect.objectContaining({ destinationPeerId: REMOTE_ID }),
        RoutingProtocol.BATMAN,
      );
    });
  });

  describe("processRefresh (refresh action dispatch)", () => {
    it("sends an ELP broadcast on BatmanElp action", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      module.refresh(RefreshAction.BatmanElp);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        expect.anything(),
      );
    });

    it("sends an OGM broadcast on BatmanOgm action", () => {
      const { module, recorder } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      module.refresh(RefreshAction.BatmanOgm);
      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.Broadcast,
        expect.anything(),
        expect.anything(),
      );
    });

    it("does nothing when the peer is inactive", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const recorder = makeEventRecorder();
      const module = new BatmanModule(SELF_ID, makeGraph(selfPeer), recorder);
      module.init();
      module.refresh(RefreshAction.BatmanElp);
      expect(recorder.record).not.toHaveBeenCalled();
    });
  });

  describe("processTick (originator table purge)", () => {
    it("purges expired routes on tick and records DeleteRoute event", () => {
      const { module, recorder } = makeModule(
        SELF_ID,
        [makePeer(FIRST_NEIGHBOUR_ID)],
        undefined,
        10,
      );

      asInternal(module).neighbourList.put(FIRST_NEIGHBOUR_ID, {
        neighbourId: FIRST_NEIGHBOUR_ID,
        throughput: 100,
        lastTick: 10,
        interval: DEFAULT_CONFIG.elpInterval,
      });
      asInternal(module).processOriginatorMessage(makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID));

      recorder.getCurrentTick.mockReturnValue(21);
      recorder.record.mockClear();

      module.processTick();

      expect(recorder.record).toHaveBeenCalledWith(
        SELF_ID,
        EventType.DeleteRoute,
        expect.objectContaining({ hopId: FIRST_NEIGHBOUR_ID }),
        RoutingProtocol.BATMAN,
      );
      expect(module.getTables().BATMAN_ORIGINATOR_TABLE).toHaveLength(0);
    });
  });

  describe("read (integration with BaseModule)", () => {
    it("returns false when peer is inactive", () => {
      const selfPeer = makePeer(SELF_ID, false);
      const module = new BatmanModule(SELF_ID, makeGraph(selfPeer), makeEventRecorder());

      module.init();
      expect(module.read(makeElpMessage(FIRST_NEIGHBOUR_ID, FIRST_NEIGHBOUR_ID))).toBe(false);
    });

    it("returns false for messages not in INCOMING_MESSAGE_TYPES", () => {
      const { module } = makeModule();
      expect(module.read({ type: MessageType.DsdvRouteUpdateMessage } as unknown as Message)).toBe(
        false,
      );
    });

    it("dispatches ELP message to processEchoLocation via read", () => {
      const { module } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      const spy = jest.spyOn(module as unknown as BatmanModuleTestAccess, "processEchoLocation");

      const msg = makeElpMessage(FIRST_NEIGHBOUR_ID, FIRST_NEIGHBOUR_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it("dispatches OGM message to processOriginatorMessage via read", () => {
      const { module } = makeModule(SELF_ID, [makePeer(FIRST_NEIGHBOUR_ID)]);
      asInternal(module).neighbourList.put(FIRST_NEIGHBOUR_ID, {
        neighbourId: FIRST_NEIGHBOUR_ID,
        throughput: 100,
        lastTick: 10,
        interval: DEFAULT_CONFIG.elpInterval,
      });

      const spy = jest.spyOn(
        module as unknown as BatmanModuleTestAccess,
        "processOriginatorMessage",
      );

      const msg = makeOgmMessage(REMOTE_ID, FIRST_NEIGHBOUR_ID);
      module.read(msg);
      expect(spy).toHaveBeenCalledWith(msg);
    });
  });
});
