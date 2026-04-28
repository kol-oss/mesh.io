import { Activity, ChevronsRight, Clock3, ExternalLink, Mail } from "lucide-react";

import { EntityType, StepType } from "../../../types/enums";
import type { LinkEntity, PeerEntity } from "../../../types/navigation";
import type { WorkflowStep } from "../../../types/steps";
import type { StepPropertiesPanelProps } from "../../../types/properties";
import { isRefreshStep } from "../../../utils/navigation/refreshSteps";
import { parseNumberValue } from "../../../utils/properties";
import Select from "../../Select/Select";
import MessageStepProperties from "./MessageStepProperties";
import MoveStepProperties from "./MoveStepProperties";
import RefreshStepProperties from "./RefreshStepProperties";
import ToggleStepProperties from "./ToggleStepProperties";

export default function StepProperties({
  widthPercent,
  onResizeStart,
  selectedStep,
  entities,
  steps,
  setSteps,
}: StepPropertiesPanelProps) {
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);

  if (isRefreshStep(selectedStep)) {
    return (
      <RefreshStepProperties
        widthPercent={widthPercent}
        onResizeStart={onResizeStart}
        selectedStep={selectedStep}
        peers={peers}
      />
    );
  }

  const toggleTargets = entities.filter(
    (entity): entity is PeerEntity | LinkEntity =>
      entity.type === EntityType.Peer || entity.type === EntityType.Link,
  );

  const stepTypeOptions = [
    { value: StepType.Move, label: "Move", icon: <ChevronsRight size={12} /> },
    { value: StepType.Message, label: "Message", icon: <Mail size={12} /> },
    { value: StepType.ToggleStatus, label: "Toggle", icon: <Activity size={12} /> },
  ] as const;

  const messageSourceValue =
    selectedStep.sourcePeerId && peers.some((peer) => peer.id === selectedStep.sourcePeerId)
      ? selectedStep.sourcePeerId
      : "";

  const messageDestinationValue =
    selectedStep.destinationPeerId &&
    selectedStep.destinationPeerId !== messageSourceValue &&
    peers.some((peer) => peer.id === selectedStep.destinationPeerId)
      ? selectedStep.destinationPeerId
      : "";

  const toggleTargetValue =
    selectedStep.targetEntityId &&
    toggleTargets.some((entity) => entity.id === selectedStep.targetEntityId)
      ? selectedStep.targetEntityId
      : "";

  const moveTargetValue =
    selectedStep.movePeerId && peers.some((peer) => peer.id === selectedStep.movePeerId)
      ? selectedStep.movePeerId
      : "";

  const toggleTargetEntity = toggleTargets.find((entity) => entity.id === toggleTargetValue);
  const reverseStatusLabel = !toggleTargetEntity
    ? "Disabled"
    : toggleTargetEntity.enabled
      ? "Disabled"
      : "Enabled";

  const isStepNameMissing = selectedStep.title.trim() === "";
  const isStepMessageSourceMissing =
    selectedStep.type === StepType.Message && messageSourceValue === "";
  const isStepMessageDestinationMissing =
    selectedStep.type === StepType.Message && messageDestinationValue === "";
  const isStepToggleEntityMissing =
    selectedStep.type === StepType.ToggleStatus && toggleTargetValue === "";
  const isStepMoveEntityMissing = selectedStep.type === StepType.Move && moveTargetValue === "";

  const updateStep = (changes: Partial<WorkflowStep>) => {
    const updatedSteps = steps.map((step) => {
      if (step.id !== selectedStep.id) {
        return step;
      }

      return {
        ...step,
        ...changes,
      };
    });

    setSteps(updatedSteps);
  };

  const updateStepTick = (nextTick: number) => {
    const normalizedTick = Math.max(1, nextTick);
    const stepIndex = steps.findIndex((step) => step.id === selectedStep.id);
    if (stepIndex === -1) {
      return;
    }

    const updatedStep = {
      ...steps[stepIndex],
      tick: normalizedTick,
    };

    const stepsWithoutCurrent = steps.filter((step) => step.id !== selectedStep.id);
    const lastSameTickIndex = (() => {
      let lastIndex = -1;
      for (let i = 0; i < stepsWithoutCurrent.length; i++) {
        if (stepsWithoutCurrent[i].tick === normalizedTick) {
          lastIndex = i;
        }
      }
      return lastIndex;
    })();

    const insertIndex =
      lastSameTickIndex >= 0
        ? lastSameTickIndex + 1
        : (() => {
            const firstGreaterIndex = stepsWithoutCurrent.findIndex(
              (step) => step.tick > normalizedTick,
            );
            return firstGreaterIndex === -1 ? stepsWithoutCurrent.length : firstGreaterIndex;
          })();

    const reorderedSteps = [...stepsWithoutCurrent];
    reorderedSteps.splice(insertIndex, 0, updatedStep);
    setSteps(reorderedSteps);
  };

  return (
    <aside className="properties" style={{ width: `${widthPercent}%` }}>
      <div className="properties__resizer" onPointerDown={onResizeStart} />
      <header className="properties__header">
        <p className="properties__title">Step</p>
        <p className="properties__subtitle">
          A discrete action in the simulation workflow, executed at a specific tick.
        </p>
        <a className="properties__read-more" href="#" tabIndex={0}>
          <ExternalLink size={12} />
          Read more
        </a>
      </header>
      <section className="properties__section">
        <p className="properties__section-title">Configuration</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isStepNameMissing ? "properties__field-label--required" : ""}`}
          >
            Name
          </span>
          <input
            className={`properties__input ${isStepNameMissing ? "properties__required-outline" : ""}`}
            type="text"
            value={selectedStep.title}
            onChange={(event) => updateStep({ title: event.target.value })}
          />
        </label>

        <div className="properties__field">
          <div className="properties__inline-group">
            <label className="properties__field">
              <span className="properties__field-label">Type</span>
              <Select
                allowEmpty={false}
                value={selectedStep.type}
                invalid={false}
                options={stepTypeOptions.map((stepType) => ({
                  value: stepType.value,
                  label: stepType.label,
                  icon: stepType.icon,
                }))}
                onChange={(value) => {
                  const nextType = value as WorkflowStep["type"];

                  if (nextType === StepType.Message) {
                    updateStep({
                      type: nextType,
                      targetEntityId: null,
                      movePeerId: null,
                    });
                    return;
                  }

                  if (nextType === StepType.ToggleStatus) {
                    updateStep({
                      type: nextType,
                      sourcePeerId: null,
                      destinationPeerId: null,
                      movePeerId: null,
                    });
                    return;
                  }

                  updateStep({
                    type: nextType,
                    sourcePeerId: null,
                    destinationPeerId: null,
                    targetEntityId: null,
                  });
                }}
              />
            </label>

            <label className="properties__field">
              <span className="properties__field-label">Tick</span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className="properties__input"
                  type="number"
                  min="1"
                  value={selectedStep.tick}
                  onChange={(event) =>
                    updateStepTick(parseNumberValue(event.target.value, selectedStep.tick))
                  }
                />
              </div>
            </label>
          </div>
        </div>

        {selectedStep.type === StepType.Message && (
          <MessageStepProperties
            selectedStep={selectedStep}
            peers={peers}
            messageSourceValue={messageSourceValue}
            messageDestinationValue={messageDestinationValue}
            isStepMessageSourceMissing={isStepMessageSourceMissing}
            isStepMessageDestinationMissing={isStepMessageDestinationMissing}
            updateStep={updateStep}
          />
        )}

        {selectedStep.type === StepType.ToggleStatus && (
          <ToggleStepProperties
            toggleTargets={toggleTargets}
            toggleTargetValue={toggleTargetValue}
            isStepToggleEntityMissing={isStepToggleEntityMissing}
            reverseStatusLabel={reverseStatusLabel}
            updateStep={updateStep}
          />
        )}

        {selectedStep.type === StepType.Move && (
          <MoveStepProperties
            selectedStep={selectedStep}
            peers={peers}
            moveTargetValue={moveTargetValue}
            isStepMoveEntityMissing={isStepMoveEntityMissing}
            updateStep={updateStep}
          />
        )}
      </section>
    </aside>
  );
}
