import { describe, test, expect } from "@jest/globals";
import { NetworkGraph } from "@/features/processor/network/NetworkGraph.ts";
import { EventRecorder } from "@/features/processor/EventRecorder.ts";
import type { PeerEntity } from "@/shared/types/model/peers.ts";
import { EntityType } from "@/shared/types/model/entities.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { DsrConfiguration } from "@/shared/types/model/configurations.ts";
import { generateUUID } from "@/shared/types/common/uuid.ts";
import type { DsrModule } from "@/features/processor/module/dsr/DsrModule.ts";
import { type RefreshStep, StepType } from "@/shared/types/model/steps.ts";

const eventRecorder = new EventRecorder();
const graph = new NetworkGraph(eventRecorder);

const A = {
  id: generateUUID(),
  name: "A",
  x: 0,
  y: 0,
  type: EntityType.Peer,
  range: 100,
  enabled: true,
  protocol: RoutingProtocol.DSR,
  configuration: {
    routeTimeout: 10,
  } satisfies DsrConfiguration,
} satisfies PeerEntity;

const B = {
  id: generateUUID(),
  name: "B",
  x: 100,
  y: 0,
  type: EntityType.Peer,
  range: 100,
  enabled: true,
  protocol: RoutingProtocol.DSR,
  configuration: {
    routeTimeout: 10,
  } satisfies DsrConfiguration,
} satisfies PeerEntity;

const C = {
  id: generateUUID(),
  name: "C",
  x: 200,
  y: 0,
  type: EntityType.Peer,
  range: 100,
  enabled: true,
  protocol: RoutingProtocol.DSR,
  configuration: {
    routeTimeout: 10,
  } satisfies DsrConfiguration,
} satisfies PeerEntity;

eventRecorder.setStep({
  id: generateUUID(),
  tick: 1,
  title: "Refresh",
  type: StepType.Refresh,
  peerId: A.id,
  protocol: RoutingProtocol.DSR,
  startTick: 1,
  interval: 1,
  action: undefined,
} satisfies RefreshStep);

graph.init([A, B, C], [], []);

describe("Route Discovery", () => {
  test("should discover route to destination", () => {
    const aModule = graph.getNode(A.id)?.module as DsrModule;

    console.log("A id ", A.id);
    console.log("B id ", B.id);
    console.log("C id ", C.id);

    const aResult = aModule.getRoute(C.id);
    console.log("resulted route: ", aResult);

    expect(aResult).not.toBeNull();

    const bModule = graph.getNode(B.id)?.module as DsrModule;
    const bResult = bModule.getRoute(C.id);

    expect(bResult).not.toBeNull();

    const cModule = graph.getNode(C.id)?.module as DsrModule;
    const cResult = cModule.getRoute(B.id);

    expect(cResult).not.toBeNull();
  });
});
