import { Activity, ChevronsRight, Clock3, ExternalLink, Link2, Mail, Radio } from "lucide-react";

import type { LinkEntity, PeerEntity } from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import type { StepPropertiesPanelProps } from "../../types/properties";
import { parseNumberValue } from "../../utils/properties";
import StyledSelect from "../Select/StyledSelect";

export default function StepProperties({
  widthPercent,
  onResizeStart,
  selectedStep,
  entities,
  steps,
  setSteps,
}: StepPropertiesPanelProps) {
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === "PEER");
  const toggleTargets = entities.filter(
    (entity): entity is PeerEntity | LinkEntity => entity.type === "PEER" || entity.type === "LINK",
  );

  const stepTypeOptions = [
    { value: "MOVE", label: "Move", icon: <ChevronsRight size={12} /> },
    { value: "MESSAGE", label: "Message", icon: <Mail size={12} /> },
    { value: "TOGGLE", label: "Toggle", icon: <Activity size={12} /> },
  ] as const;

  const peerSelectOptions = peers.map((peer) => ({
    value: peer.id,
    label: peer.name,
    icon: <Radio size={12} />,
  }));

  const toggleTargetOptions = toggleTargets.map((entity) => ({
    value: entity.id,
    label: entity.name,
    icon: entity.type === "PEER" ? <Radio size={12} /> : <Link2 size={12} />,
  }));

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
  const isStepMessageSourceMissing = selectedStep.type === "MESSAGE" && messageSourceValue === "";
  const isStepMessageDestinationMissing =
    selectedStep.type === "MESSAGE" && messageDestinationValue === "";
  const isStepToggleEntityMissing = selectedStep.type === "TOGGLE" && toggleTargetValue === "";
  const isStepMoveEntityMissing = selectedStep.type === "MOVE" && moveTargetValue === "";

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
              <StyledSelect
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

                  if (nextType === "MESSAGE") {
                    updateStep({
                      type: nextType,
                      targetEntityId: null,
                      movePeerId: null,
                    });
                    return;
                  }

                  if (nextType === "TOGGLE") {
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

        {selectedStep.type === "MESSAGE" && (
          <div className="properties__field">
            <div className="properties__inline-group">
              <div className="properties__field">
                <span
                  className={`properties__field-label ${isStepMessageSourceMissing ? "properties__field-label--required" : ""}`}
                >
                  Source
                </span>
                <StyledSelect
                  value={messageSourceValue}
                  invalid={isStepMessageSourceMissing}
                  options={peerSelectOptions}
                  onChange={(value) => {
                    const nextSource = value || null;
                    const nextDestination =
                      nextSource && selectedStep.destinationPeerId === nextSource
                        ? null
                        : selectedStep.destinationPeerId;

                    updateStep({
                      sourcePeerId: nextSource,
                      destinationPeerId: nextDestination,
                    });
                  }}
                />
              </div>

              <div className="properties__field">
                <span
                  className={`properties__field-label ${isStepMessageDestinationMissing ? "properties__field-label--required" : ""}`}
                >
                  Destination
                </span>
                <StyledSelect
                  value={messageDestinationValue}
                  invalid={isStepMessageDestinationMissing}
                  options={peerSelectOptions.filter((peer) => peer.value !== messageSourceValue)}
                  onChange={(value) => {
                    const nextDestination = value || null;
                    if (nextDestination && nextDestination === messageSourceValue) {
                      return;
                    }
                    updateStep({ destinationPeerId: nextDestination });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {selectedStep.type === "TOGGLE" && (
          <div className="properties__field">
            <div className="properties__inline-group">
              <div className="properties__field">
                <span
                  className={`properties__field-label ${isStepToggleEntityMissing ? "properties__field-label--required" : ""}`}
                >
                  Entity
                </span>
                <StyledSelect
                  value={toggleTargetValue}
                  invalid={isStepToggleEntityMissing}
                  options={toggleTargetOptions}
                  onChange={(value) => updateStep({ targetEntityId: value || null })}
                />
              </div>

              <label className="properties__field">
                <span
                  className={`properties__field-label ${isStepToggleEntityMissing ? "properties__field-label--required" : ""}`}
                >
                  New status
                </span>
                <button
                  className={`properties__status ${isStepToggleEntityMissing ? "properties__required-outline" : ""}`}
                  type="button"
                  disabled
                >
                  <Activity size={12} />
                  {reverseStatusLabel}
                </button>
              </label>
            </div>
          </div>
        )}

        {selectedStep.type === "MOVE" && (
          <>
            <label className="properties__field">
              <span
                className={`properties__field-label ${isStepMoveEntityMissing ? "properties__field-label--required" : ""}`}
              >
                Peer
              </span>
              <StyledSelect
                value={moveTargetValue}
                invalid={isStepMoveEntityMissing}
                options={peerSelectOptions}
                onChange={(value) => {
                  const nextMovePeerId = value || null;
                  const selectedPeer = peers.find((peer) => peer.id === nextMovePeerId);
                  const hasMoveCoordinates = selectedStep.x !== 0 || selectedStep.y !== 0;

                  if (!selectedPeer || hasMoveCoordinates) {
                    updateStep({ movePeerId: nextMovePeerId });
                    return;
                  }

                  updateStep({
                    movePeerId: nextMovePeerId,
                    x: selectedPeer.x,
                    y: selectedPeer.y,
                  });
                }}
              />
            </label>

            <label className="properties__field">
              <span className="properties__field-label">Position</span>
              <div className="properties__inline-group">
                <div className="properties__input-with-icon">
                  <span className="properties__input-icon">X</span>
                  <input
                    className="properties__input"
                    type="number"
                    value={selectedStep.x}
                    onChange={(event) =>
                      updateStep({
                        x: parseNumberValue(event.target.value, selectedStep.x),
                      })
                    }
                  />
                </div>
                <div className="properties__input-with-icon">
                  <span className="properties__input-icon">Y</span>
                  <input
                    className="properties__input"
                    type="number"
                    value={selectedStep.y}
                    onChange={(event) =>
                      updateStep({
                        y: parseNumberValue(event.target.value, selectedStep.y),
                      })
                    }
                  />
                </div>
              </div>
            </label>
          </>
        )}
      </section>
    </aside>
  );
}
