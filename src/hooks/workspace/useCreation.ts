import { useCallback } from "react";

import { OBSTACLE_DEFAULT_WIDTH, OBSTACLE_DEFAULT_HEIGHT } from "../../constants/obstacle.ts";
import { NEW_PEER_RANGE } from "../../constants/workspace";
import { EntityType, RoutingProtocol, StepType } from "../../types/enums";
import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../types/entities";
import type {
  ManualWorkflowStep,
  MessageStep,
  MoveStep,
  ToggleStatusStep,
  WorkflowStep,
} from "../../types/steps";
import type { WorkspaceTextItem } from "../../types/workspace";
import type {
  WorkspaceCreationCallbacks,
  WorkspaceCreationSetters,
} from "../../types/workspace/creation";
import { ui } from "../../i18n/messages";
import { generateUUID, type UUID } from "../../types/uuid";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";

import { BATMAN_DEFAULT_CONFIGURATION } from "../../constants/batman.ts";
import { DSDV_DEFAULT_CONFIGURATION } from "../../constants/dsdv.ts";

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
        name: ui.entities.typePeer,
        type: EntityType.Peer,
        locked: false,
        x,
        y,
        range: NEW_PEER_RANGE,
        enabled: true,
        protocols: [RoutingProtocol.BATMAN],
        ...BATMAN_DEFAULT_CONFIGURATION,
        ...DSDV_DEFAULT_CONFIGURATION,
      };

      setters.setEntities([...entities, nextPeer]);
      callbacks.onEntitySelect(nextPeer.id);
      callbacks.showCreationToast(ui.entities.toastAdded(nextPeer.name));
    },
    [callbacks, entities, setters],
  );

  const createObstacleAt = useCallback(
    (x: number, y: number) => {
      const nextObstacle: ObstacleEntity = {
        id: generateUUID(),
        name: ui.entities.typeObstacle,
        type: EntityType.Obstacle,
        locked: false,
        x,
        y,
        width: OBSTACLE_DEFAULT_WIDTH,
        height: OBSTACLE_DEFAULT_HEIGHT,
      };

      setters.setEntities([...entities, nextObstacle]);
      callbacks.onEntitySelect(nextObstacle.id);
      callbacks.showCreationToast(ui.entities.toastAdded(nextObstacle.name));
    },
    [callbacks, entities, setters],
  );

  const createLink = useCallback(
    (sourcePeerId: UUID, destinationPeerId: UUID) => {
      const nextLink: LinkEntity = {
        id: generateUUID(),
        name: ui.entities.typeLink,
        type: EntityType.Link,
        locked: false,
        sourcePeerId,
        destinationPeerId,
        enabled: true,
      };

      setters.setEntities([...entities, nextLink]);
      callbacks.onEntitySelect(nextLink.id);
      callbacks.showCreationToast(ui.entities.toastAdded(nextLink.name));
    },
    [callbacks, entities, setters],
  );

  const createStep = useCallback(
    (step: ManualWorkflowStep) => {
      setters.setSteps([...steps, step]);
      callbacks.onStepSelect(step.id);
      callbacks.showCreationToast(ui.steps.toastAdded(step.title));
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
        title: ui.steps.typeMessage,
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
        title: ui.steps.typeMove,
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
        title: ui.steps.typeToggle,
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
        text: ui.workspace.createdText,
        x,
        y,
      };

      setters.setTexts([...texts, nextText]);
      callbacks.showCreationToast(ui.workspace.toastTextAdded);
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
