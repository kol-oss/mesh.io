import { LinkEntitySchema } from "@/shared/schemas/entity/LinkEntitySchema";
import { ObstacleEntitySchema } from "@/shared/schemas/entity/ObstacleSchema";
import { PeerEntitySchema } from "@/shared/schemas/entity/PeerEntitySchema";
import { StepSchema } from "@/shared/schemas/step/StepSchema";
import type { DisplayState } from "@/shared/store/slices/displaySlice";
import { TABS } from "@/shared/store/slices/displaySlice";
import { ActionGroup, ActionMode, type ActionModesByGroup } from "@/shared/types/action";
import type { ImportPayload } from "@/shared/types/common/migration";
import type { LinkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities";
import type { TextItem } from "@/shared/types/workspace/text";
import { z } from "zod";

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

const isValidPeerEntity = (value: unknown): value is PeerEntity => {
  return PeerEntitySchema.safeParse(value).success;
};

const isValidLinkEntity = (value: unknown): value is LinkEntity => {
  return LinkEntitySchema.safeParse(value).success;
};

const isValidObstacleEntity = (value: unknown): value is ObstacleEntity => {
  return ObstacleEntitySchema.safeParse(value).success;
};

const isValidTextItem = (value: unknown): value is TextItem => {
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

const ImportStepsSchema = z.array(StepSchema);

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

  const parsedSteps = ImportStepsSchema.safeParse(parsed.steps);

  if (
    Array.isArray(parsed.peers) &&
    parsed.peers.every(isValidPeerEntity) &&
    Array.isArray(parsed.links) &&
    parsed.links.every(isValidLinkEntity) &&
    Array.isArray(parsed.obstacles) &&
    parsed.obstacles.every(isValidObstacleEntity) &&
    parsedSteps.success &&
    (!("texts" in parsed) ||
      (Array.isArray(parsed.texts) && parsed.texts.every(isValidTextItem))) &&
    (!("display" in parsed) || isValidDisplayState(parsed.display))
  ) {
    return {
      peers: parsed.peers,
      links: parsed.links,
      obstacles: parsed.obstacles,
      steps: parsedSteps.data,
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
  return `mesh-io-${stamp}.json`;
};
