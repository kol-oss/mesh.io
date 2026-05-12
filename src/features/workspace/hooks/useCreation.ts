import { useCallback } from "react";

import { OBSTACLE_DEFAULT_WIDTH, OBSTACLE_DEFAULT_HEIGHT } from "../../../shared/constants/obstacle.ts";
import { NEW_PEER_RANGE } from "../../../shared/constants/workspace";
import { EntityType, RoutingProtocol, StepType } from "../../../shared/types/enums";
import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../../shared/types/entities";
import type {
  ManualWorkflowStep,
  MessageStep,
  MoveStep,
  ToggleStatusStep,
  WorkflowStep,
} from "../../../shared/types/steps";
import type { WorkspaceTextItem } from "../../../shared/types/workspace";
import type {
  WorkspaceCreationCallbacks,
  WorkspaceCreationSetters,
} from "../../../shared/types/workspace/creation";import { generateUUID, type UUID } from "../../../shared/types/uuid";
import { isRefreshStep } from "../../../shared/utils/navigation/refreshSteps";

import { BATMAN_DEFAULT_CONFIGURATION } from "../../../shared/constants/batman.ts";
import { AODV_DEFAULT_CONFIGURATION } from "../../../shared/constants/aodv";
import { DSDV_DEFAULT_CONFIGURATION } from "../../../shared/constants/dsdv.ts";
import { OLSR_DEFAULT_CONFIGURATION } from "../../../shared/constants/olsr";

type UseWorkspaceCreationParams = {
  entities: NetworkEntity[];
  steps: WorkflowStep[];
  texts: WorkspaceTextItem[];
  setters: WorkspaceCreationSetters;
  callbacks: WorkspaceCreationCallbacks;
};

export function useWorkspaceCreation({
  entities,
  steps,
  texts,
  setters,
  callbacks,
}: UseWorkspaceCreationParams) {
  const createPeerAt = useCallback(
    (x: number, y: number) => {
      const nextPeer: PeerEntity = {
        id: generateUUID(),
        name: "Peer",
        type: EntityType.Peer,
        locked: false,
        x,
        y,
        range: NEW_PEER_RANGE,
        enabled: true,
        protocols: [RoutingProtocol.BATMAN],
        ...BATMAN_DEFAULT_CONFIGURATION,
        ...AODV_DEFAULT_CONFIGURATION,
        ...DSDV_DEFAULT_CONFIGURATION,
        ...OLSR_DEFAULT_CONFIGURATION,
      };

      setters.setEntities([...entities, nextPeer]);
      callbacks.onEntitySelect(nextPeer.id);
      callbacks.showCreationToast((`Entity "${(nextPeer.name)}" added`));
    },
    [callbacks, entities, setters],
  );

  const createObstacleAt = useCallback(
    (x: number, y: number) => {
      const nextObstacle: ObstacleEntity = {
        id: generateUUID(),
        name: "Obstacle",
        type: EntityType.Obstacle,
        locked: false,
        x,
        y,
        width: OBSTACLE_DEFAULT_WIDTH,
        height: OBSTACLE_DEFAULT_HEIGHT,
      };

      setters.setEntities([...entities, nextObstacle]);
      callbacks.onEntitySelect(nextObstacle.id);
      callbacks.showCreationToast((`Entity "${(nextObstacle.name)}" added`));
    },
    [callbacks, entities, setters],
  );

  const createLink = useCallback(
    (sourcePeerId: UUID, destinationPeerId: UUID) => {
      const nextLink: LinkEntity = {
        id: generateUUID(),
        name: "Link",
        type: EntityType.Link,
        locked: false,
        sourcePeerId,
        destinationPeerId,
        enabled: true,
      };

      setters.setEntities([...entities, nextLink]);
      callbacks.onEntitySelect(nextLink.id);
      callbacks.showCreationToast((`Entity "${(nextLink.name)}" added`));
    },
    [callbacks, entities, setters],
  );

  const createStep = useCallback(
    (step: ManualWorkflowStep) => {
      setters.setSteps([...steps, step]);
      callbacks.onStepSelect(step.id);
      callbacks.showCreationToast((`Step "${(step.title)}" added`));
    },
    [callbacks, setters, steps],
  );

  const getNextManualStepTick = useCallback(() => {
    const manualSteps = steps.filter((step) => !isRefreshStep(step));
    if (manualSteps.length === 0) {
      return 2;
    }

    return Math.max(2, manualSteps[manualSteps.length - 1].tick);
  }, [steps]);

  const createMessageStep = useCallback(
    (sourcePeerId: UUID, destinationPeerId: UUID) => {
      const step: MessageStep = {
        id: generateUUID(),
        title: "Message",
        type: StepType.Message,
        tick: getNextManualStepTick(),
        sourcePeerId,
        destinationPeerId,
      };

      createStep(step);
    },
    [createStep, getNextManualStepTick],
  );

  const createMoveStep = useCallback(
    (movePeerId: UUID, x: number, y: number) => {
      const step: MoveStep = {
        id: generateUUID(),
        title: "Move",
        type: StepType.Move,
        tick: getNextManualStepTick(),
        movePeerId,
        x,
        y,
      };

      createStep(step);
    },
    [createStep, getNextManualStepTick],
  );

  const createToggleStep = useCallback(
    (targetEntityId: UUID) => {
      const step: ToggleStatusStep = {
        id: generateUUID(),
        title: "Toggle",
        type: StepType.ToggleStatus,
        tick: getNextManualStepTick(),
        targetEntityId,
      };

      createStep(step);
    },
    [createStep, getNextManualStepTick],
  );

  const createTextAt = useCallback(
    (x: number, y: number) => {
      const nextText: WorkspaceTextItem = {
        id: generateUUID(),
        text: "Text",
        x,
        y,
      };

      setters.setTexts([...texts, nextText]);
      callbacks.showCreationToast("Text added");
    },
    [callbacks, setters, texts],
  );

  return {
    createPeerAt,
    createObstacleAt,
    createLink,
    createMessageStep,
    createMoveStep,
    createToggleStep,
    createTextAt,
  };
}
