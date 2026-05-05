import { useEffect, useMemo, useState } from "react";
import { MOVE_STEP_ANIMATION_DURATION } from "../../constants/animation";
import type { SimulationEvent, SimulationStepResult } from "../../types/simulation";
import type {
  MessageAnimation,
  MoveStepAnimation,
  ToggleStepAnimation,
} from "../../types/workspace/scene";
import type { NetworkEntity } from "../../types/entities";
import {
  buildSimulationMessageAnimations,
  buildMoveStepAnimation,
  buildToggleStepAnimation,
} from "../../utils/workspace/simulationAnimation";

type Props = {
  currentSimulationEvent: SimulationEvent | null;
  currentSimulationStepResult: SimulationStepResult | null;
  baseRenderedEntities: NetworkEntity[];
  peers: Array<NetworkEntity & { type: "PEER" }>;
};

type Return = {
  moveStepAnimationProgress: number;
  moveStepAnimation: MoveStepAnimation | null;
  toggleStepAnimation: ToggleStepAnimation | null;
  simulationMessageAnimations: MessageAnimation[];
  renderedEntities: NetworkEntity[];
};

export const useWorkspaceAnimations = ({
  currentSimulationEvent,
  currentSimulationStepResult,
  baseRenderedEntities,
  peers,
}: Props): Return => {
  const [moveStepAnimationProgress, setMoveStepAnimationProgress] = useState(1);

  const moveStepAnimationSource = useMemo(
    () => buildMoveStepAnimation(currentSimulationEvent),
    [currentSimulationEvent],
  );

  useEffect(() => {
    if (!moveStepAnimationSource) {
      return;
    }

    let frameId = 0;
    let startedAt: number | null = null;

    const animate = (now: number) => {
      if (startedAt === null) {
        startedAt = now;
      }

      const elapsed = now - startedAt;
      const nextProgress = Math.min(1, elapsed / MOVE_STEP_ANIMATION_DURATION);
      setMoveStepAnimationProgress(nextProgress);

      if (nextProgress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [moveStepAnimationSource]);

  const moveStepAnimation = useMemo<MoveStepAnimation | null>(() => {
    if (!moveStepAnimationSource) {
      return null;
    }

    return {
      ...moveStepAnimationSource,
      progress: moveStepAnimationProgress,
    };
  }, [moveStepAnimationProgress, moveStepAnimationSource]);

  const toggleStepAnimation = useMemo<ToggleStepAnimation | null>(
    () => buildToggleStepAnimation(currentSimulationEvent),
    [currentSimulationEvent],
  );

  const simulationMessageAnimations = useMemo(
    () =>
      buildSimulationMessageAnimations(currentSimulationEvent, currentSimulationStepResult, peers),
    [currentSimulationEvent, currentSimulationStepResult, peers],
  );

  const renderedEntities = useMemo(() => {
    if (!moveStepAnimation) {
      return baseRenderedEntities;
    }

    return baseRenderedEntities.map((entity) => {
      if (entity.type !== "PEER" || entity.id !== moveStepAnimation.peerId) {
        return entity;
      }

      return {
        ...entity,
        x:
          moveStepAnimation.fromX +
          (moveStepAnimation.toX - moveStepAnimation.fromX) * moveStepAnimation.progress,
        y:
          moveStepAnimation.fromY +
          (moveStepAnimation.toY - moveStepAnimation.fromY) * moveStepAnimation.progress,
      };
    });
  }, [baseRenderedEntities, moveStepAnimation]);

  return {
    moveStepAnimationProgress,
    moveStepAnimation,
    toggleStepAnimation,
    simulationMessageAnimations,
    renderedEntities,
  };
};
