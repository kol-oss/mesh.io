import { useCallback } from "react";

import { getDefaultLink } from "@/shared/constants/entities/link";
import { getDefaultObstacle } from "@/shared/constants/entities/obstacle";
import { getDefaultPeer } from "@/shared/constants/entities/peer";
import { getDefaultText } from "@/shared/constants/entities/text";
import {
  getDefaultMessageStep,
  getDefaultMoveStep,
  getDefaultToggleStep,
} from "@/shared/constants/steps/step";
import { type UUID } from "@/shared/types/common/uuid.ts";
import type { NetworkEntity, ObstacleEntity, PeerEntity } from "@/shared/types/model/entities.ts";
import type { Step, UserStep } from "@/shared/types/model/steps.ts";
import type {
  WorkspaceCreationCallbacks,
  WorkspaceCreationSetters,
} from "@/shared/types/workspace/creation";
import type { TextItem } from "@/shared/types/workspace/text";
import { isRefreshStep } from "@/shared/utils/navigation/refreshSteps";

type UseCreationParams = {
  entities: NetworkEntity[];
  steps: Step[];
  texts: TextItem[];
  setters: WorkspaceCreationSetters;
  callbacks: WorkspaceCreationCallbacks;
};

export function useCreation({ entities, steps, texts, setters, callbacks }: UseCreationParams) {
  const createPeerAt = useCallback(
    (x: number, y: number) => {
      const nextPeer: PeerEntity = getDefaultPeer(x, y);

      setters.setEntities([...entities, nextPeer]);
      callbacks.onEntitySelect(nextPeer.id);
      callbacks.showCreationToast(`Entity "${nextPeer.name}" added`);
    },
    [callbacks, entities, setters],
  );

  const createObstacleAt = useCallback(
    (x: number, y: number) => {
      const nextObstacle: ObstacleEntity = getDefaultObstacle(x, y);

      setters.setEntities([...entities, nextObstacle]);
      callbacks.onEntitySelect(nextObstacle.id);
      callbacks.showCreationToast(`Entity "${nextObstacle.name}" added`);
    },
    [callbacks, entities, setters],
  );

  const createLink = useCallback(
    (sourcePeerId: UUID, destinationPeerId: UUID) => {
      const nextLink = getDefaultLink(sourcePeerId, destinationPeerId);

      setters.setEntities([...entities, nextLink]);
      callbacks.onEntitySelect(nextLink.id);
      callbacks.showCreationToast(`Entity "${nextLink.name}" added`);
    },
    [callbacks, entities, setters],
  );

  const createStep = useCallback(
    (step: UserStep) => {
      setters.setSteps([...steps, step]);
      callbacks.onStepSelect(step.id);
      callbacks.showCreationToast(`Step "${step.title}" added`);
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
      const step = getDefaultMessageStep(sourcePeerId, destinationPeerId, getNextManualStepTick());
      createStep(step);
    },
    [createStep, getNextManualStepTick],
  );

  const createMoveStep = useCallback(
    (movePeerId: UUID, x: number, y: number) => {
      const step = getDefaultMoveStep(movePeerId, x, y, getNextManualStepTick());
      createStep(step);
    },
    [createStep, getNextManualStepTick],
  );

  const createToggleStep = useCallback(
    (targetEntityId: UUID) => {
      const target = entities.find((entity) => entity.id === targetEntityId);
      const nextStatus = target && "enabled" in target ? !target.enabled : false;
      const step = getDefaultToggleStep(targetEntityId, getNextManualStepTick(), nextStatus);
      createStep(step);
    },
    [createStep, entities, getNextManualStepTick],
  );

  const createTextAt = useCallback(
    (x: number, y: number) => {
      const nextText = getDefaultText(x, y);

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
