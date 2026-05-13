import { Activity, ChevronsRight, Clock3, ExternalLink, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { EntityType } from "@/shared/types/model/entities";
import { StepType } from "@/shared/types/model/steps";
import type { LinkEntity, PeerEntity } from "@/shared/types/model/entities";
import type {
  ManualWorkflowStep,
  MessageStep,
  MoveStep,
  ToggleStep,
  WorkflowStep,
} from "@/shared/types/model/steps";
import type { StepPropertiesPanelProps } from "@/shared/types/view/properties";
import { isRefreshStep } from "@/shared/utils/navigation/refreshSteps";
import { parseNumberValue } from "@/shared/utils/properties";
import Select from "@/shared/components/Select/Select";
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
    { value: StepType.Toggle, label: "Toggle", icon: <Activity size={12} /> },
  ] as const;

  const messageSourceValue =
    selectedStep.type === StepType.Message &&
    peers.some((peer) => peer.id === selectedStep.sourcePeerId)
      ? (selectedStep.sourcePeerId ?? "")
      : "";

  const messageDestinationValue =
    selectedStep.type === StepType.Message &&
    selectedStep.destinationPeerId !== (messageSourceValue || null) &&
    peers.some((peer) => peer.id === selectedStep.destinationPeerId)
      ? (selectedStep.destinationPeerId ?? "")
      : "";

  const toggleTargetValue =
    selectedStep.type === StepType.Toggle &&
    toggleTargets.some((entity) => entity.id === selectedStep.targetEntityId)
      ? (selectedStep.targetEntityId ?? "")
      : "";

  const moveTargetValue =
    selectedStep.type === StepType.Move && peers.some((peer) => peer.id === selectedStep.movePeerId)
      ? (selectedStep.movePeerId ?? "")
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
    selectedStep.type === StepType.Toggle && toggleTargetValue === "";
  const isStepMoveEntityMissing = selectedStep.type === StepType.Move && moveTargetValue === "";

  const updateSelectedManualStep = (changes: Partial<ManualWorkflowStep>) => {
    const updatedSteps = steps.map((step) => {
      if (step.id !== selectedStep.id) {
        return step;
      }

      if (step.type === StepType.Message) {
        return {
          ...step,
          ...(changes as Partial<MessageStep>),
        } satisfies MessageStep;
      }

      if (step.type === StepType.Move) {
        return {
          ...step,
          ...(changes as Partial<MoveStep>),
        } satisfies MoveStep;
      }

      if (step.type === StepType.Toggle) {
        return {
          ...step,
          ...(changes as Partial<ToggleStep>),
        } satisfies ToggleStep;
      }

      return step;
    });

    setSteps(updatedSteps);
  };

  const convertStepType = (step: WorkflowStep, nextType: ManualWorkflowStep["type"]) => {
    if (step.type === nextType || isRefreshStep(step)) {
      return step;
    }

    const base = {
      id: step.id,
      title: step.title,
      tick: step.tick,
    };

    if (nextType === StepType.Message) {
      return {
        ...base,
        type: StepType.Message,
        sourcePeerId: null,
        destinationPeerId: null,
      } satisfies MessageStep;
    }

    if (nextType === StepType.Toggle) {
      return {
        ...base,
        type: StepType.Toggle,
        targetEntityId: null,
      } satisfies ToggleStep;
    }

    return {
      ...base,
      type: StepType.Move,
      movePeerId: null,
      x: 0,
      y: 0,
    } satisfies MoveStep;
  };

  const updateStepTick = (nextTick: number) => {
    const normalizedTick = Math.max(2, nextTick);
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
        <p className="properties__title">{"Step"}</p>
        <p className="properties__subtitle">
          {"A discrete action in the simulation workflow, executed at a specific tick."}
        </p>
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {"Read more"}
        </Link>
      </header>
      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isStepNameMissing ? "properties__field-label--required" : ""}`}
          >
            {"Name"}
          </span>
          <input
            className={`properties__input ${isStepNameMissing ? "properties__required-outline" : ""}`}
            type="text"
            value={selectedStep.title}
            onChange={(event) => updateSelectedManualStep({ title: event.target.value })}
          />
        </label>

        <div className="properties__field">
          <div className="properties__inline-group">
            <label className="properties__field">
              <span className="properties__field-label">{"Type"}</span>
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
                  const nextType = value as ManualWorkflowStep["type"];
                  const updatedSteps = steps.map((step) =>
                    step.id === selectedStep.id ? convertStepType(step, nextType) : step,
                  );
                  setSteps(updatedSteps);
                }}
              />
            </label>

            <label className="properties__field">
              <span className="properties__field-label">{"Tick"}</span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className="properties__input"
                  type="number"
                  min="2"
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
            updateStep={updateSelectedManualStep}
          />
        )}

        {selectedStep.type === StepType.Toggle && (
          <ToggleStepProperties
            toggleTargets={toggleTargets}
            toggleTargetValue={toggleTargetValue}
            isStepToggleEntityMissing={isStepToggleEntityMissing}
            reverseStatusLabel={reverseStatusLabel}
            updateStep={updateSelectedManualStep}
          />
        )}

        {selectedStep.type === StepType.Move && (
          <MoveStepProperties
            selectedStep={selectedStep}
            peers={peers}
            moveTargetValue={moveTargetValue}
            isStepMoveEntityMissing={isStepMoveEntityMissing}
            updateStep={updateSelectedManualStep}
          />
        )}
      </section>
    </aside>
  );
}
