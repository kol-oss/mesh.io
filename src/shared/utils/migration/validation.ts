import { peerRoutingProtocols, workflowStepTypes } from "@/shared/constants/protocol";
import type { DisplayState } from "@/shared/store/slices/displaySlice";
import { TABS } from "@/shared/store/slices/displaySlice";
import { ActionGroup, ActionMode, type ActionModesByGroup } from "@/shared/types/action";
import type { ImportPayload } from "@/shared/types/common/migration";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
} from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import { RefreshAction, StepType, type Step } from "@/shared/types/model/steps";
import type { WorkspaceTextItem } from "@/shared/types/workspace/text";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const isNullableString = (value: unknown): value is string | null => {
  return typeof value === "string" || value === null;
};

const isBoolean = (value: unknown): value is boolean => {
  return typeof value === "boolean";
};

const isValidProtocol = (value: unknown): value is RoutingProtocol => {
  return typeof value === "string" && peerRoutingProtocols.includes(value as RoutingProtocol);
};

const isValidConfiguration = (protocol: RoutingProtocol, value: unknown) => {
  if (!isRecord(value)) {
    return false;
  }

  switch (protocol) {
    case RoutingProtocol.BATMAN:
      return (
        isFiniteNumber(value.distancePenaltyDistance) &&
        value.distancePenaltyDistance > 0 &&
        isFiniteNumber(value.distancePenaltyPercent) &&
        value.distancePenaltyPercent >= 0 &&
        isFiniteNumber(value.elpInterval) &&
        value.elpInterval > 0 &&
        isFiniteNumber(value.ogmInterval) &&
        value.ogmInterval > 0 &&
        isFiniteNumber(value.purgeTimeout) &&
        value.purgeTimeout > 0
      );
    case RoutingProtocol.DSDV:
      return (
        isFiniteNumber(value.incrementalUpdateInterval) &&
        value.incrementalUpdateInterval > 0 &&
        isFiniteNumber(value.fullDumpInterval) &&
        value.fullDumpInterval > 0 &&
        isFiniteNumber(value.routeTimeout) &&
        value.routeTimeout > 0
      );
    case RoutingProtocol.AODV:
      return (
        isFiniteNumber(value.helloInterval) &&
        value.helloInterval > 0 &&
        isFiniteNumber(value.routeTimeout) &&
        value.routeTimeout > 0
      );
    case RoutingProtocol.OLSR:
      return (
        isFiniteNumber(value.helloInterval) &&
        value.helloInterval > 0 &&
        isFiniteNumber(value.tcInterval) &&
        value.tcInterval > 0
      );
    case RoutingProtocol.DSR:
      return true;
  }
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
      isValidProtocol(value.protocol) &&
      isValidConfiguration(value.protocol, value.configuration)
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

const isValidTextItem = (value: unknown): value is WorkspaceTextItem => {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y)
  );
};

const isValidOpenedTabs = (
  value: unknown,
): value is DisplayState["openedTabs"] | Partial<DisplayState["openedTabs"]> => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (!(TABS.ENTITIES in value) || isBoolean(value[TABS.ENTITIES])) &&
    (!(TABS.STEPS in value) || isBoolean(value[TABS.STEPS]))
  );
};

const isValidToolbarModesByGroup = (
  value: unknown,
): value is ActionModesByGroup | Partial<ActionModesByGroup> => {
  if (!isRecord(value)) {
    return false;
  }

  const allowedModesByGroup: Record<ActionGroup, ActionMode[]> = {
    [ActionGroup.Navigation]: [ActionMode.NavigationMove],
    [ActionGroup.Entities]: [ActionMode.Peer, ActionMode.Link, ActionMode.Obstacle],
    [ActionGroup.Steps]: [ActionMode.Message, ActionMode.Move, ActionMode.Toggle],
    [ActionGroup.Inspection]: [ActionMode.RoutingTable, ActionMode.PacketStructure],
    [ActionGroup.Text]: [ActionMode.Text],
  };

  return Object.entries(allowedModesByGroup).every(([group, allowedModes]) => {
    const mode = value[group];
    return mode === undefined || allowedModes.includes(mode as ActionMode);
  });
};

const isValidDisplayState = (value: unknown): value is Partial<DisplayState> => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (!("selectedId" in value) || isNullableString(value.selectedId)) &&
    (!("openedTabs" in value) || isValidOpenedTabs(value.openedTabs)) &&
    (!("refreshHidden" in value) || isBoolean(value.refreshHidden)) &&
    (!("navCollapsed" in value) || isBoolean(value.navCollapsed)) &&
    (!("selectedToolbarGroup" in value) ||
      Object.values(ActionGroup).includes(value.selectedToolbarGroup as ActionGroup)) &&
    (!("toolbarModesByGroup" in value) || isValidToolbarModesByGroup(value.toolbarModesByGroup))
  );
};

const isValidWorkflowStep = (value: unknown): value is Step => {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    !workflowStepTypes.includes(value.type as Step["type"]) ||
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

  if (value.type === StepType.Toggle) {
    return isNullableString(value.targetEntityId);
  }

  if (value.type === StepType.Refresh) {
    return (
      isNullableString(value.refreshPeerId) &&
      (value.refreshProtocol == null ||
        peerRoutingProtocols.includes(value.refreshProtocol as RoutingProtocol)) &&
      (value.refreshAction == null ||
        Object.values(RefreshAction).includes(value.refreshAction as RefreshAction)) &&
      (value.refreshStartTick == null || isFiniteNumber(value.refreshStartTick)) &&
      (value.refreshInterval == null || isFiniteNumber(value.refreshInterval)) &&
      (value.autoGenerated == null || typeof value.autoGenerated === "boolean")
    );
  }

  return false;
};

export const validateAndParseImportPayload = (raw: string): ImportPayload => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  if (!isRecord(parsed)) {
    throw new Error("File must contain a JSON object.");
  }

  if (
    Array.isArray(parsed.peers) &&
    parsed.peers.every(isValidNetworkEntity) &&
    parsed.peers.every((entity): entity is PeerEntity => entity.type === EntityType.Peer) &&
    Array.isArray(parsed.links) &&
    parsed.links.every(isValidNetworkEntity) &&
    parsed.links.every((entity): entity is LinkEntity => entity.type === EntityType.Link) &&
    Array.isArray(parsed.obstacles) &&
    parsed.obstacles.every(isValidNetworkEntity) &&
    parsed.obstacles.every(
      (entity): entity is ObstacleEntity => entity.type === EntityType.Obstacle,
    ) &&
    Array.isArray(parsed.steps) &&
    parsed.steps.every(isValidWorkflowStep) &&
    (!("texts" in parsed) ||
      (Array.isArray(parsed.texts) && parsed.texts.every(isValidTextItem))) &&
    (!("display" in parsed) || isValidDisplayState(parsed.display))
  ) {
    return {
      peers: parsed.peers,
      links: parsed.links,
      obstacles: parsed.obstacles,
      steps: parsed.steps,
      texts: Array.isArray(parsed.texts) ? parsed.texts : [],
      display: isRecord(parsed.display) ? parsed.display : {},
    };
  }

  throw new Error("Invalid workspace format. Expected peers, links, obstacles, and steps arrays.");
};

export const getExportFileName = (date = new Date()) => {
  const toPart = (value: number) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${toPart(date.getMonth() + 1)}${toPart(date.getDate())}-${toPart(
    date.getHours(),
  )}${toPart(date.getMinutes())}${toPart(date.getSeconds())}`;
  return `mesh-io-export-${stamp}.json`;
};
