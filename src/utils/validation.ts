import { peerRoutingProtocols, workflowStepTypes } from "../constants/protocol";
import { ui } from "../i18n/messages";
import { EntityType, StepType } from "../types/enums";
import type { NetworkEntity } from "../types/entities";
import type { PeerRoutingProtocol } from "../types/navigation";
import { RefreshAction, type WorkflowStep } from "../types/steps";

export type WorkspaceImportPayload = {
  entities: NetworkEntity[];
  steps: WorkflowStep[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNullableString = (value: unknown): value is string | null => {
  return typeof value === "string" || value === null;
};

const isValidProtocolList = (value: unknown): value is PeerRoutingProtocol[] => {
  return (
    Array.isArray(value) &&
    value.length === 1 &&
    value.every((item) => peerRoutingProtocols.includes(item as PeerRoutingProtocol))
  );
};

const isValidNetworkEntity = (value: unknown): value is NetworkEntity => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return false;
  }

  if ("locked" in value && typeof value.locked !== "boolean") {
    return false;
  }

  if (value.type === EntityType.Peer) {
    return (
      isFiniteNumber(value.x) &&
      isFiniteNumber(value.y) &&
      isFiniteNumber(value.range) &&
      value.range > 0 &&
      typeof value.enabled === "boolean" &&
      isValidProtocolList(value.protocols) &&
      isFiniteNumber(value.batmanDistancePenaltyDistance) &&
      value.batmanDistancePenaltyDistance > 0 &&
      isFiniteNumber(value.batmanDistancePenaltyPercent) &&
      value.batmanDistancePenaltyPercent >= 0 &&
      isFiniteNumber(value.batmanElpInterval) &&
      value.batmanElpInterval > 0 &&
      isFiniteNumber(value.batmanOgmInterval) &&
      isFiniteNumber(value.batmanPurgeTimeout) &&
      (value.dsdvIncrementalUpdateInterval == null ||
        (isFiniteNumber(value.dsdvIncrementalUpdateInterval) &&
          value.dsdvIncrementalUpdateInterval > 0)) &&
      (value.dsdvFullDumpInterval == null ||
        (isFiniteNumber(value.dsdvFullDumpInterval) && value.dsdvFullDumpInterval > 0)) &&
      (value.dsdvRouteTimeout == null ||
        (isFiniteNumber(value.dsdvRouteTimeout) && value.dsdvRouteTimeout > 0)) &&
      (value.aodvHelloInterval == null ||
        (isFiniteNumber(value.aodvHelloInterval) && value.aodvHelloInterval > 0)) &&
      (value.aodvRouteTimeout == null ||
        (isFiniteNumber(value.aodvRouteTimeout) && value.aodvRouteTimeout > 0)) &&
      (value.olsrHelloInterval == null ||
        (isFiniteNumber(value.olsrHelloInterval) && value.olsrHelloInterval > 0)) &&
      (value.olsrTcInterval == null ||
        (isFiniteNumber(value.olsrTcInterval) && value.olsrTcInterval > 0))
    );
  }

  if (value.type === EntityType.Link) {
    return (
      isNullableString(value.sourcePeerId) &&
      isNullableString(value.destinationPeerId) &&
      typeof value.enabled === "boolean"
    );
  }

  if (value.type === EntityType.Obstacle) {
    return (
      isFiniteNumber(value.x) &&
      isFiniteNumber(value.y) &&
      isFiniteNumber(value.width) &&
      value.width > 0 &&
      isFiniteNumber(value.height) &&
      value.height > 0
    );
  }

  return false;
};

const isValidWorkflowStep = (value: unknown): value is WorkflowStep => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    !workflowStepTypes.includes(value.type as WorkflowStep["type"]) ||
    !isFiniteNumber(value.tick)
  ) {
    return false;
  }

  if (value.type === StepType.Message) {
    return isNullableString(value.sourcePeerId) && isNullableString(value.destinationPeerId);
  }

  if (value.type === StepType.Move) {
    return isNullableString(value.movePeerId) && isFiniteNumber(value.x) && isFiniteNumber(value.y);
  }

  if (value.type === StepType.ToggleStatus) {
    return isNullableString(value.targetEntityId);
  }

  if (value.type === StepType.Refresh) {
    return (
      isNullableString(value.refreshPeerId) &&
      (value.refreshProtocol == null ||
        peerRoutingProtocols.includes(value.refreshProtocol as PeerRoutingProtocol)) &&
      (value.refreshAction == null ||
        value.refreshAction === RefreshAction.BatmanElp ||
        value.refreshAction === RefreshAction.BatmanOgm ||
        value.refreshAction === RefreshAction.DsdvFullDump ||
        value.refreshAction === RefreshAction.DsdvIncremental ||
        value.refreshAction === RefreshAction.AodvHello ||
        value.refreshAction === RefreshAction.OlsrHello ||
        value.refreshAction === RefreshAction.OlsrTc) &&
      (value.refreshStartTick == null || isFiniteNumber(value.refreshStartTick)) &&
      (value.refreshInterval == null || isFiniteNumber(value.refreshInterval)) &&
      (value.autoGenerated == null || typeof value.autoGenerated === "boolean")
    );
  }

  return false;
};

export const parseWorkspaceImportPayload = (raw: string): WorkspaceImportPayload => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(ui.validation.invalidJsonFile);
  }

  if (!isRecord(parsed)) {
    throw new Error(ui.validation.invalidJsonObject);
  }

  if (!Array.isArray(parsed.entities) || !parsed.entities.every(isValidNetworkEntity)) {
    throw new Error(ui.validation.invalidEntitiesList);
  }

  if (!Array.isArray(parsed.steps) || !parsed.steps.every(isValidWorkflowStep)) {
    throw new Error(ui.validation.invalidStepsList);
  }

  return {
    entities: parsed.entities,
    steps: parsed.steps,
  };
};

export const getWorkspaceExportFileName = (date = new Date()) => {
  const toPart = (value: number) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${toPart(date.getMonth() + 1)}${toPart(date.getDate())}-${toPart(
    date.getHours(),
  )}${toPart(date.getMinutes())}${toPart(date.getSeconds())}`;
  return `mesh-io-export-${stamp}.json`;
};
