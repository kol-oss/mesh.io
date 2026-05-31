import { describe, test } from "@jest/globals";
import { NetworkGraph } from "@/features/processor/network/NetworkGraph.ts";
import { EventRecorder } from "@/features/processor/EventRecorder.ts";
import type { PeerEntity } from "@/shared/types/model/peers.ts";
import { EntityType } from "@/shared/types/model/entities.ts";
import { RoutingProtocol } from "@/shared/types/common/protocols.ts";
import type { DsrConfiguration } from "@/shared/types/model/configurations.ts";
import { generateUUID } from "@/shared/types/common/uuid.ts";
import type { DsrModule } from "@/features/processor/module/dsr/NewDsrModule.ts";
import { type RefreshStep, StepType } from "@/shared/types/model/steps.ts";

const eventRecorder = new EventRecorder();
const graph = new NetworkGraph(eventRecorder);

const A = {
  id: generateUUID(),
  name: "A",
  x: 0,
  y: 0,
  type: EntityType.Peer,
  range: 150,
  enabled: true,
  protocol: RoutingProtocol.DSR,
  configuration: {
    routeTimeout: 10,
  } satisfies DsrConfiguration,
} satisfies PeerEntity;

const B = {
  id: generateUUID(),
  name: "B",
  x: 75,
  y: 75,
  type: EntityType.Peer,
  range: 150,
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

graph.init([A, B], [], []);

describe("Route Discovery", () => {
  test("should discover route to destination", () => {
    const module = graph.getNode(A.id)?.module as DsrModule;

    const result = module.getRoute(B.id);
    console.log(result);
  });
});
