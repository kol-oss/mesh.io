import { RoutingProtocol } from "@/shared/types/common/protocols";
import type {
  AodvConfiguration,
  BatmanConfiguration,
  DsdvConfiguration,
  OlsrConfiguration,
} from "@/shared/types/model/configurations";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import {
  RefreshAction,
  StepType,
  createStepBase,
  isMessageStep,
  isMoveStep,
  isRefreshStepType,
  type MessageStep,
  type MoveStep,
  type RefreshStep,
  type Step,
  type ToggleStep,
  type UserStep,
} from "@/shared/types/model/steps";

export const isRefreshStep = (step: Step): step is RefreshStep => isRefreshStepType(step);

const sortStepsByTick = (steps: Step[]) => {
  return [...steps].sort((a, b) => {
    if (a.tick !== b.tick) {
      return a.tick - b.tick;
    }
    return 0;
  });
};

const buildBatmanRefreshTicks = (
  manualSteps: Step[],
  peer: PeerEntity,
  maxTick: number,
  interval: number,
) => {
  const normalizedInterval = Math.max(1, Math.floor(interval));
  const toggleStatusByTick = new Map<number, boolean>();

  for (const step of manualSteps) {
    if (step.type !== StepType.Toggle || step.entityId !== peer.id) {
      continue;
    }

    toggleStatusByTick.set(step.tick, step.status);
  }

  let isEnabled = peer.enabled;
  let activeStartTick: number | null = isEnabled ? 1 : null;
  const refreshTicks: Array<{ tick: number; startTick: number }> = [];

  for (let tick = 0; tick <= maxTick; tick += 1) {
    const nextEnabled = toggleStatusByTick.get(tick) ?? isEnabled;

    if (!isEnabled && nextEnabled) {
      activeStartTick = tick;
    }

    if (
      nextEnabled &&
      activeStartTick !== null &&
      tick >= activeStartTick &&
      (tick - activeStartTick) % normalizedInterval === 0
    ) {
      refreshTicks.push({ tick, startTick: activeStartTick });
    }

    if (isEnabled && !nextEnabled) {
      activeStartTick = null;
    }

    isEnabled = nextEnabled;
  }

  return refreshTicks;
};

const buildRefreshStepsForPeer = (
  manualSteps: UserStep[],
  peer: PeerEntity,
  maxTick: number,
): RefreshStep[] => {
  const refreshSteps: RefreshStep[] = [];
  const createRefreshStep = (step: Omit<RefreshStep, "id">): RefreshStep => ({
    ...step,
    id: [
      "refresh",
      step.peerId,
      step.protocol,
      step.action ?? "none",
      step.tick,
      step.startTick,
      step.interval,
    ].join("::"),
  });

  if (peer.protocol === RoutingProtocol.BATMAN) {
    const configuration = peer.configuration as BatmanConfiguration;
    if (!configuration) {
      return refreshSteps;
    }

    const elpInterval = Math.max(1, Math.floor(configuration.elpInterval));
    const ogmInterval = Math.max(1, Math.floor(configuration.ogmInterval));
    const elpSteps = buildBatmanRefreshTicks(manualSteps, peer, maxTick, elpInterval).map(
      ({ tick, startTick }) =>
        createRefreshStep({
          title: `ELP Refresh on ${peer.name}`,
          tick: Math.max(0, Math.floor(tick)),
          type: StepType.Refresh,
          peerId: peer.id,
          protocol: RoutingProtocol.BATMAN,
          action: RefreshAction.BatmanElp,
          startTick: startTick,
          interval: elpInterval,
        }),
    );
    const ogmSteps = buildBatmanRefreshTicks(manualSteps, peer, maxTick, ogmInterval).map(
      ({ tick, startTick }) =>
        createRefreshStep({
          title: `OGM Broadcast on ${peer.name}`,
          tick: Math.max(0, Math.floor(tick)),
          type: StepType.Refresh,
          peerId: peer.id,
          protocol: RoutingProtocol.BATMAN,
          action: RefreshAction.BatmanOgm,
          startTick: startTick,
          interval: ogmInterval,
        }),
    );

    refreshSteps.push(...elpSteps, ...ogmSteps);
  }

  if (peer.protocol === RoutingProtocol.DSDV) {
    const configuration = peer.configuration as DsdvConfiguration;
    if (!configuration) {
      return refreshSteps;
    }

    const fullDumpInterval = Math.max(1, Math.floor(configuration.dumpInterval));
    const incrementalInterval = Math.max(1, Math.floor(configuration.refreshInterval));

    const fullDumpSteps = buildBatmanRefreshTicks(manualSteps, peer, maxTick, fullDumpInterval).map(
      ({ tick, startTick }) =>
        createRefreshStep({
          title: `DSDV Full Dump on ${peer.name}`,
          tick: Math.max(0, Math.floor(tick)),
          type: StepType.Refresh,
          peerId: peer.id,
          protocol: RoutingProtocol.DSDV,
          action: RefreshAction.DsdvFullDump,
          startTick: startTick,
          interval: fullDumpInterval,
        }),
    );

    const incrementalSteps = buildBatmanRefreshTicks(
      manualSteps,
      peer,
      maxTick,
      incrementalInterval,
    ).map(({ tick, startTick }) =>
      createRefreshStep({
        title: `DSDV Incremental Update on ${peer.name}`,
        tick: Math.max(0, Math.floor(tick)),
        type: StepType.Refresh,
        peerId: peer.id,
        protocol: RoutingProtocol.DSDV,
        action: RefreshAction.DsdvIncremental,
        startTick: startTick,
        interval: incrementalInterval,
      }),
    );

    refreshSteps.push(...fullDumpSteps, ...incrementalSteps);
  }

  if (peer.protocol === RoutingProtocol.AODV) {
    const configuration = peer.configuration as AodvConfiguration;
    if (!configuration) {
      return refreshSteps;
    }

    const helloInterval = Math.max(1, Math.floor(configuration.helloInterval));

    const helloSteps = buildBatmanRefreshTicks(manualSteps, peer, maxTick, helloInterval).map(
      ({ tick, startTick }) =>
        createRefreshStep({
          title: `AODV HELLO on ${peer.name}`,
          tick: Math.max(0, Math.floor(tick)),
          type: StepType.Refresh,
          peerId: peer.id,
          protocol: RoutingProtocol.AODV,
          action: RefreshAction.AodvHello,
          startTick: startTick,
          interval: helloInterval,
        }),
    );

    refreshSteps.push(...helloSteps);
  }

  if (peer.protocol === RoutingProtocol.OLSR) {
    const configuration = peer.configuration as OlsrConfiguration;
    if (!configuration) {
      return refreshSteps;
    }

    const helloInterval = Math.max(1, Math.floor(configuration.helloInterval));
    const tcInterval = Math.max(1, Math.floor(configuration.tcInterval));

    const helloSteps = buildBatmanRefreshTicks(manualSteps, peer, maxTick, helloInterval).map(
      ({ tick, startTick }) =>
        createRefreshStep({
          title: `OLSR HELLO on ${peer.name}`,
          tick: Math.max(0, Math.floor(tick)),
          type: StepType.Refresh,
          peerId: peer.id,
          protocol: RoutingProtocol.OLSR,
          action: RefreshAction.OlsrHello,
          startTick: startTick,
          interval: helloInterval,
        }),
    );

    const tcSteps = buildBatmanRefreshTicks(manualSteps, peer, maxTick, tcInterval).map(
      ({ tick, startTick }) =>
        createRefreshStep({
          title: `OLSR TC on ${peer.name}`,
          tick: Math.max(0, Math.floor(tick)),
          type: StepType.Refresh,
          peerId: peer.id,
          protocol: RoutingProtocol.OLSR,
          action: RefreshAction.OlsrTc,
          startTick: startTick,
          interval: tcInterval,
        }),
    );

    refreshSteps.push(...helloSteps, ...tcSteps);
  }

  return refreshSteps;
};

const normalizeMessageStep = (step: MessageStep, index: number): MessageStep => {
  const base = createStepBase({
    ...step,
    tick: Number.isFinite(step.tick) ? step.tick : index + 1,
  });
  return {
    ...base,
    type: StepType.Message,
    sourceId: step.sourceId,
    destinationId: step.destinationId,
  };
};

const normalizeMoveStep = (step: MoveStep, index: number): MoveStep => {
  const base = createStepBase({
    ...step,
    tick: Number.isFinite(step.tick) ? step.tick : index + 1,
  });
  return {
    ...base,
    type: StepType.Move,
    entityId: step.entityId,
    x: Number.isFinite(step.x) ? step.x : 0,
    y: Number.isFinite(step.y) ? step.y : 0,
  };
};

const normalizeToggleStep = (step: ToggleStep, index: number): ToggleStep => {
  const base = createStepBase({
    ...step,
    tick: Number.isFinite(step.tick) ? step.tick : index + 1,
  });
  return {
    ...base,
    type: StepType.Toggle,
    entityId: step.entityId,
    status: typeof step.status === "boolean" ? step.status : false,
  };
};

const resolveToggleStatuses = (steps: UserStep[], entities: NetworkEntity[]): UserStep[] => {
  const statusByEntityId = new Map<string, boolean>();
  for (const entity of entities) {
    if (entity.type === EntityType.Peer || entity.type === EntityType.Link) {
      statusByEntityId.set(entity.id, entity.enabled);
    }
  }

  return steps.map((step) => {
    if (step.type !== StepType.Toggle || step.entityId === null) {
      return step;
    }

    const currentStatus = statusByEntityId.get(step.entityId);
    if (typeof currentStatus !== "boolean") {
      return step;
    }

    const nextStatus = !currentStatus;
    statusByEntityId.set(step.entityId, nextStatus);

    return {
      ...step,
      status: nextStatus,
    } satisfies ToggleStep;
  });
};

const normalizeManualStep = (step: Step, index: number): UserStep | null => {
  if (isRefreshStep(step)) {
    return null;
  }

  if (isMessageStep(step)) {
    return normalizeMessageStep(step, index);
  }

  if (isMoveStep(step)) {
    return normalizeMoveStep(step, index);
  }

  if (step.type === StepType.Toggle) {
    return normalizeToggleStep(step, index);
  }

  return null;
};

export const normalizeManualSteps = (steps: Step[], entities?: NetworkEntity[]) => {
  const normalized = steps
    .map((step, index) => normalizeManualStep(step, index))
    .filter((step): step is UserStep => step !== null);

  if (!entities) {
    return normalized;
  }

  return resolveToggleStatuses(normalized, entities);
};

const isExecutableManualStep = (step: UserStep) => {
  if (isMessageStep(step)) {
    return (
      step.sourceId !== null && step.destinationId !== null && step.sourceId !== step.destinationId
    );
  }

  if (isMoveStep(step)) {
    return step.entityId !== null;
  }

  return step.entityId !== null;
};

export const sanitizeManualSteps = (steps: Step[], entities?: NetworkEntity[]) => {
  return normalizeManualSteps(steps, entities).filter(isExecutableManualStep);
};

export const composeStepsWithRefresh = (steps: Step[], entities: NetworkEntity[]) => {
  const manualSteps = normalizeManualSteps(sortStepsByTick(steps), entities);
  const executableManualSteps = manualSteps.filter(isExecutableManualStep);
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);
  const maxTick =
    manualSteps.length === 0 ? 1 : Math.max(1, ...manualSteps.map((step) => step.tick));

  const refreshByTick = new Map<number, RefreshStep[]>();
  for (const peer of peers) {
    const refreshSteps = buildRefreshStepsForPeer(executableManualSteps, peer, maxTick);
    for (const refreshStep of refreshSteps) {
      const bucket = refreshByTick.get(refreshStep.tick) ?? [];
      bucket.push(refreshStep);
      refreshByTick.set(refreshStep.tick, bucket);
    }
  }

  for (const [tick, bucket] of refreshByTick.entries()) {
    bucket.sort((a, b) => {
      const actionOrder: Record<string, number> = {
        [RefreshAction.BatmanElp]: 0,
        [RefreshAction.BatmanOgm]: 1,
        [RefreshAction.DsdvFullDump]: 2,
        [RefreshAction.DsdvIncremental]: 3,
        [RefreshAction.AodvHello]: 4,
        [RefreshAction.OlsrHello]: 5,
        [RefreshAction.OlsrTc]: 6,
      };

      const actionRank =
        (actionOrder[a.action ?? ""] ?? Number.MAX_SAFE_INTEGER) -
        (actionOrder[b.action ?? ""] ?? Number.MAX_SAFE_INTEGER);

      if (actionRank !== 0) {
        return actionRank;
      }

      return a.title.localeCompare(b.title);
    });
    refreshByTick.set(tick, bucket);
  }

  const result: Step[] = [];
  const stepsByTick = new Map<number, Step[]>();
  for (const step of manualSteps) {
    const bucket = stepsByTick.get(step.tick) ?? [];
    bucket.push(step);
    stepsByTick.set(step.tick, bucket);
  }

  for (let tick = 0; tick <= maxTick; tick += 1) {
    const manualAtTick = stepsByTick.get(tick) ?? [];
    result.push(...manualAtTick);
    result.push(...(refreshByTick.get(tick) ?? []));
  }

  return result;
};
