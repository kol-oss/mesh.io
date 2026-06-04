import type { NetworkGraph } from "@/features/processor/types/network/graph";
import type { Peer } from "@/features/processor/types/network/peer";
import type { EventRecorder } from "@/features/processor/types/recorder";
import type { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import { jest } from "@jest/globals";

export function makeEventRecorder(tick = 10): jest.Mocked<EventRecorder> {
  return {
    record: jest.fn<EventRecorder["record"]>(),
    setStep: jest.fn<EventRecorder["setStep"]>(),
    setListener: jest.fn<EventRecorder["setListener"]>(),
    getEvents: jest.fn<EventRecorder["getEvents"]>().mockReturnValue([]),
    getCurrentTick: jest.fn<EventRecorder["getCurrentTick"]>().mockReturnValue(tick),
  };
}

export function makePeer(
  id: UUID,
  protocol: RoutingProtocol,
  configuration: PeerConfiguration,
  active = true,
): Peer {
  return {
    id,
    name: id,
    active,
    protocol,
    coordinates: { x: 0, y: 0 },
    range: 200,
    configuration,
    module: {
      read: jest.fn<() => boolean>().mockReturnValue(true),
      send: jest.fn<() => boolean>().mockReturnValue(true),
      refresh: jest.fn<() => void>(),
    },
  };
}

export function makeGraph(selfPeer: Peer, neighbours: Peer[] = []): jest.Mocked<NetworkGraph> {
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
