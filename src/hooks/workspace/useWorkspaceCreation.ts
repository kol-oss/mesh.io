import { useCallback } from "react";

import {
  workspaceNewObstacleHeight,
  workspaceNewObstacleWidth,
  workspaceNewPeerRange,
} from "../../constants/workspace";
import { EntityType, RoutingProtocol, StepType } from "../../types/enums";
import type { LinkEntity, NetworkEntity, ObstacleEntity, PeerEntity } from "../../types/navigation";
import type {
  ManualWorkflowStep,
  MessageStep,
  MoveStep,
  ToggleStatusStep,
  WorkflowStep,
} from "../../types/workspace/steps";
import type { WorkspaceTextItem } from "../../types/workspace";
import type {
  WorkspaceCreationCallbacks,
  WorkspaceCreationSetters,
} from "../../types/workspace/creation";
import { generateUUID } from "../../utils/uuid";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";

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
        name: `Peer`,
        type: EntityType.Peer,
        locked: false,
        x,
        y,
        range: workspaceNewPeerRange,
        enabled: true,
        protocols: [RoutingProtocol.BATMAN],
        batmanOgmInterval: 1,
        batmanPurgeTimeout: 10,
      };

      setters.setEntities([...entities, nextPeer]);
      callbacks.onEntitySelect(nextPeer.id);
      callbacks.showCreationToast(`Entity "${nextPeer.name}" added`);
    },
    [callbacks, entities, setters],
  );

  const createObstacleAt = useCallback(
    (x: number, y: number) => {
      const nextObstacle: ObstacleEntity = {
        id: generateUUID(),
        name: `Obstacle`,
        type: EntityType.Obstacle,
        locked: false,
        x,
        y,
        width: workspaceNewObstacleWidth,
        height: workspaceNewObstacleHeight,
      };

      setters.setEntities([...entities, nextObstacle]);
      callbacks.onEntitySelect(nextObstacle.id);
      callbacks.showCreationToast(`Entity "${nextObstacle.name}" added`);
    },
    [callbacks, entities, setters],
  );

  const createLink = useCallback(
    (sourcePeerId: string, destinationPeerId: string) => {
      const nextLink: LinkEntity = {
        id: generateUUID(),
        name: `Link`,
        type: EntityType.Link,
        locked: false,
        sourcePeerId,
        destinationPeerId,
        enabled: true,
      };

      setters.setEntities([...entities, nextLink]);
      callbacks.onEntitySelect(nextLink.id);
      callbacks.showCreationToast(`Entity "${nextLink.name}" added`);
    },
    [callbacks, entities, setters],
  );

  const createStep = useCallback(
    (step: ManualWorkflowStep) => {
      setters.setSteps([...steps, step]);
      callbacks.onStepSelect(step.id);
      callbacks.showCreationToast(`Step "${step.title}" added`);
    },
    [callbacks, setters, steps],
  );

  const getNextManualStepTick = useCallback(() => {
    const manualSteps = steps.filter((step) => !isRefreshStep(step));
    if (manualSteps.length === 0) {
      return 1;
    }

    return Math.max(1, manualSteps[manualSteps.length - 1].tick);
  }, [steps]);

  const createMessageStep = useCallback(
    (sourcePeerId: string, destinationPeerId: string) => {
      const step: MessageStep = {
        id: `step-${generateUUID()}`,
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
    (movePeerId: string, x: number, y: number) => {
      const step: MoveStep = {
        id: `step-${generateUUID()}`,
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
    (targetEntityId: string) => {
      const step: ToggleStatusStep = {
        id: `step-${generateUUID()}`,
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
        id: `text-${generateUUID()}`,
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
