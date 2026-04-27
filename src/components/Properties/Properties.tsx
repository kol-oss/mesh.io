import {
  Activity,
  ChevronsRight,
  CircleDot,
  Clock3,
  Diamond,
  ExternalLink,
  Lock,
  Link2,
  Mail,
  MoveHorizontal,
  MoveVertical,
  Radio,
  RotateCw,
} from "lucide-react";

import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import StyledSelect from "../Select/StyledSelect";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
  PeerRoutingProtocol,
} from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";
import { isRefreshStep } from "../../utils/navigation/refreshSteps";

type PropertiesProps = {
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
  isNavCollapsed: boolean;
};

const PROTOCOLS: PeerRoutingProtocol[] = ["HWMP", "BATMAN", "OLSR", "AODV", "DSR"];

const parseNumberValue = (value: string, fallback: number) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parsePositiveNumberValue = (value: string, fallback: number, minimum = 1) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= minimum ? parsedValue : fallback;
};

export default function Properties({
  selectedId,
  selectedSource,
  entities,
  setEntities,
  steps,
  setSteps,
  isNavCollapsed,
}: PropertiesProps) {
  const { widthPercent, onResizeStart } = useSidebarResize({ side: "right" });

  if (isNavCollapsed || !selectedId || !selectedSource) {
    return null;
  }

  if (selectedSource === "steps") {
    const selectedStep = steps.find((step) => step.id === selectedId);
    if (!selectedStep) {
      return null;
    }

    const peers = entities.filter((entity): entity is PeerEntity => entity.type === "PEER");

    if (isRefreshStep(selectedStep)) {
      const refreshPeer = peers.find((peer) => peer.id === selectedStep.refreshPeerId) ?? null;

      return (
        <aside className="properties properties--locked" style={{ width: `${widthPercent}%` }}>
          <div className="properties__resizer" onPointerDown={onResizeStart} />
          <header className="properties__header">
            <p className="properties__title">Routing Step</p>
            <p className="properties__subtitle">
              Auto-generated intervaled routing refresh step for peer protocol state
              synchronization.
            </p>
            <a className="properties__read-more" href="#" tabIndex={0}>
              <ExternalLink size={12} />
              Read more
            </a>
          </header>

          <div className="properties__locked-notice">
            <Lock size={12} />
            This step is unmodifiable.
          </div>

          <section className="properties__section">
            <p className="properties__section-title">Configuration</p>

            <label className="properties__field">
              <span className="properties__field-label">Name</span>
              <input
                className="properties__input"
                type="text"
                value={selectedStep.title}
                disabled
              />
            </label>

            <div className="properties__inline-group">
              <label className="properties__field">
                <span className="properties__field-label">Peer</span>
                <div className="properties__input-with-prefix">
                  <Radio size={12} />
                  <input
                    className="properties__input"
                    type="text"
                    value={refreshPeer?.name ?? "Unknown peer"}
                    disabled
                  />
                </div>
              </label>

              <label className="properties__field">
                <span className="properties__field-label">Protocol</span>
                <input
                  className="properties__input"
                  type="text"
                  value={selectedStep.refreshProtocol ?? "Unknown protocol"}
                  disabled
                />
              </label>
            </div>

            <div className="properties__inline-group">
              <label className="properties__field">
                <span className="properties__field-label">Start tick</span>
                <div className="properties__input-with-prefix">
                  <Clock3 size={12} />
                  <input
                    className="properties__input"
                    type="number"
                    value={selectedStep.refreshStartTick ?? selectedStep.tick}
                    disabled
                  />
                </div>
              </label>

              <label className="properties__field">
                <span className="properties__field-label">Interval</span>
                <div className="properties__input-with-prefix">
                  <RotateCw size={12} />
                  <input
                    className="properties__input"
                    type="number"
                    value={selectedStep.refreshInterval ?? 1}
                    disabled
                  />
                </div>
              </label>
            </div>
          </section>
        </aside>
      );
    }

    const toggleTargets = entities.filter(
      (entity): entity is PeerEntity | LinkEntity =>
        entity.type === "PEER" || entity.type === "LINK",
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

  const selectedEntity = entities.find((entity) => entity.id === selectedId);
  if (!selectedEntity) {
    return null;
  }

  const entityHeader: Record<string, { title: string; description: string }> = {
    PEER: {
      title: "Peer",
      description: "A mesh network node with built-in support for specific routing protocols.",
    },
    LINK: {
      title: "Link",
      description: "A persistent bidirectional connection between two nodes in the network.",
    },
    OBSTACLE: {
      title: "Obstacle",
      description: "A physical barrier that blocks signal propagation between nearby nodes.",
    },
  };

  const { title: entityTitle, description: entityDescription } = entityHeader[selectedEntity.type];

  if (selectedEntity.type === "LINK") {
    const selectedLink: LinkEntity = selectedEntity;
    const isLocked = selectedLink.locked === true;
    const peers = entities.filter((entity): entity is PeerEntity => entity.type === "PEER");

    const sourceValue =
      selectedLink.sourcePeerId && peers.some((peer) => peer.id === selectedLink.sourcePeerId)
        ? selectedLink.sourcePeerId
        : "";
    const destinationValue =
      selectedLink.destinationPeerId &&
      selectedLink.destinationPeerId !== sourceValue &&
      peers.some((peer) => peer.id === selectedLink.destinationPeerId)
        ? selectedLink.destinationPeerId
        : "";

    const isLinkNameMissing = selectedLink.name.trim() === "";
    const isLinkSourceMissing = sourceValue === "";
    const isLinkDestinationMissing = destinationValue === "";

    const linkPeerOptions = peers.map((peer) => ({
      value: peer.id,
      label: peer.name,
      icon: <Radio size={12} />,
    }));

    const updateLink = (changes: Partial<LinkEntity>) => {
      if (isLocked) return;

      const nextSource =
        "sourcePeerId" in changes
          ? (changes.sourcePeerId ?? null)
          : (selectedLink.sourcePeerId ?? null);
      const nextDestination =
        "destinationPeerId" in changes
          ? (changes.destinationPeerId ?? null)
          : (selectedLink.destinationPeerId ?? null);

      if (nextSource && nextDestination && nextSource === nextDestination) {
        return;
      }

      const updatedEntities = entities.map((entity) => {
        if (entity.id !== selectedLink.id || entity.type !== "LINK") {
          return entity;
        }

        return {
          ...entity,
          ...changes,
        };
      });

      setEntities(updatedEntities);
    };

    return (
      <aside
        className={`properties ${isLocked ? "properties--locked" : ""}`}
        style={{ width: `${widthPercent}%` }}
      >
        <div
          className="properties__resizer"
          role="separator"
          aria-label="Resize properties"
          aria-orientation="vertical"
          onPointerDown={onResizeStart}
        />

        <header className="properties__header">
          <p className="properties__title">{entityTitle}</p>
          <p className="properties__subtitle">{entityDescription}</p>
          <a className="properties__read-more" href="#" tabIndex={0}>
            <ExternalLink size={12} />
            Read more
          </a>
        </header>

        {isLocked && (
          <div className="properties__locked-notice">
            <Lock size={12} />
            This entity is unmodifiable.
          </div>
        )}

        <section className="properties__section">
          <p className="properties__section-title">Configuration</p>

          <label className="properties__field">
            <span
              className={`properties__field-label ${isLinkNameMissing ? "properties__field-label--required" : ""}`}
            >
              Name
            </span>
            <input
              className={`properties__input ${isLinkNameMissing ? "properties__required-outline" : ""}`}
              type="text"
              value={selectedLink.name}
              onChange={(event) => updateLink({ name: event.target.value })}
            />
          </label>

          <div className="properties__field">
            <div className="properties__inline-group">
              <div className="properties__field">
                <span
                  className={`properties__field-label ${isLinkSourceMissing ? "properties__field-label--required" : ""}`}
                >
                  Source
                </span>
                <StyledSelect
                  value={sourceValue}
                  invalid={isLinkSourceMissing}
                  options={linkPeerOptions}
                  onChange={(value) => {
                    const nextSource = value || null;
                    const nextDestination =
                      nextSource && selectedLink.destinationPeerId === nextSource
                        ? null
                        : selectedLink.destinationPeerId;

                    updateLink({
                      sourcePeerId: nextSource,
                      destinationPeerId: nextDestination,
                    });
                  }}
                />
              </div>

              <div className="properties__field">
                <span
                  className={`properties__field-label ${isLinkDestinationMissing ? "properties__field-label--required" : ""}`}
                >
                  Destination
                </span>
                <StyledSelect
                  value={destinationValue}
                  invalid={isLinkDestinationMissing}
                  options={linkPeerOptions.filter((peer) => peer.value !== sourceValue)}
                  onChange={(value) => {
                    const nextDestination = value || null;
                    if (nextDestination && nextDestination === sourceValue) {
                      return;
                    }
                    updateLink({ destinationPeerId: nextDestination });
                  }}
                />
              </div>
            </div>
          </div>

          <label className="properties__field">
            <span className="properties__field-label">Status</span>
            <button
              className="properties__status"
              type="button"
              onClick={() => updateLink({ enabled: !selectedLink.enabled })}
            >
              <Diamond size={12} />
              {selectedLink.enabled ? "Enabled" : "Disabled"}
            </button>
          </label>
        </section>
      </aside>
    );
  }

  if (selectedEntity.type !== "PEER") {
    const selectedObstacle: ObstacleEntity = selectedEntity;
    const isLocked = selectedObstacle.locked === true;
    const isObstacleNameMissing = selectedObstacle.name.trim() === "";

    const updateObstacle = (changes: Partial<ObstacleEntity>) => {
      if (isLocked) return;
      const updatedEntities = entities.map((entity) => {
        if (entity.id !== selectedObstacle.id || entity.type !== "OBSTACLE") {
          return entity;
        }
        return { ...entity, ...changes };
      });
      setEntities(updatedEntities);
    };

    return (
      <aside
        className={`properties ${isLocked ? "properties--locked" : ""}`}
        style={{ width: `${widthPercent}%` }}
      >
        <div
          className="properties__resizer"
          role="separator"
          aria-label="Resize properties"
          aria-orientation="vertical"
          onPointerDown={onResizeStart}
        />

        <header className="properties__header">
          <p className="properties__title">{entityTitle}</p>
          <p className="properties__subtitle">{entityDescription}</p>
          <a className="properties__read-more" href="#" tabIndex={0}>
            <ExternalLink size={12} />
            Read more
          </a>
        </header>

        {isLocked && (
          <div className="properties__locked-notice">
            <Lock size={12} />
            This entity is unmodifiable.
          </div>
        )}

        <section className="properties__section">
          <p className="properties__section-title">Configuration</p>

          <label className="properties__field">
            <span
              className={`properties__field-label ${isObstacleNameMissing ? "properties__field-label--required" : ""}`}
            >
              Name
            </span>
            <input
              className={`properties__input ${isObstacleNameMissing ? "properties__required-outline" : ""}`}
              type="text"
              value={selectedObstacle.name}
              onChange={(event) => updateObstacle({ name: event.target.value })}
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
                  value={selectedObstacle.x}
                  onChange={(event) =>
                    updateObstacle({
                      x: parseNumberValue(event.target.value, selectedObstacle.x),
                    })
                  }
                />
              </div>
              <div className="properties__input-with-icon">
                <span className="properties__input-icon">Y</span>
                <input
                  className="properties__input"
                  type="number"
                  value={selectedObstacle.y}
                  onChange={(event) =>
                    updateObstacle({
                      y: parseNumberValue(event.target.value, selectedObstacle.y),
                    })
                  }
                />
              </div>
            </div>
          </label>

          <label className="properties__field">
            <span className="properties__field-label">Size</span>
            <div className="properties__inline-group">
              <div className="properties__input-with-prefix">
                <MoveHorizontal size={12} />
                <input
                  className="properties__input"
                  type="number"
                  min="1"
                  value={selectedObstacle.width}
                  onChange={(event) =>
                    updateObstacle({
                      width: parseNumberValue(event.target.value, selectedObstacle.width),
                    })
                  }
                />
              </div>
              <div className="properties__input-with-prefix">
                <MoveVertical size={12} />
                <input
                  className="properties__input"
                  type="number"
                  min="1"
                  value={selectedObstacle.height}
                  onChange={(event) =>
                    updateObstacle({
                      height: parseNumberValue(event.target.value, selectedObstacle.height),
                    })
                  }
                />
              </div>
            </div>
          </label>
        </section>
      </aside>
    );
  }

  const selectedPeer: PeerEntity = selectedEntity;

  const isLocked = selectedPeer.locked === true;
  const isPeerNameMissing = selectedPeer.name.trim() === "";
  const isProtocolMissing = selectedPeer.protocols.length === 0;
  const isBatmanOgmMissing =
    selectedPeer.protocols.includes("BATMAN") && selectedPeer.batmanOgmInterval <= 0;
  const isBatmanPurgeMissing =
    selectedPeer.protocols.includes("BATMAN") && selectedPeer.batmanPurgeTimeout <= 0;

  const updatePeer = (changes: Partial<PeerEntity>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.id !== selectedPeer.id || entity.type !== "PEER") {
        return entity;
      }

      return {
        ...entity,
        ...changes,
      };
    });

    setEntities(updatedEntities);
  };

  return (
    <aside
      className={`properties ${isLocked ? "properties--locked" : ""}`}
      style={{ width: `${widthPercent}%` }}
    >
      <div
        className="properties__resizer"
        role="separator"
        aria-label="Resize properties"
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
      />

      <header className="properties__header">
        <p className="properties__title">{entityTitle}</p>
        <p className="properties__subtitle">{entityDescription}</p>
        <a className="properties__read-more" href="#" tabIndex={0}>
          <ExternalLink size={12} />
          Read more
        </a>
      </header>

      {isLocked && (
        <div className="properties__locked-notice">
          <Lock size={12} />
          This entity is unmodifiable.
        </div>
      )}

      <section className="properties__section">
        <p className="properties__section-title">Configuration</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isPeerNameMissing ? "properties__field-label--required" : ""}`}
          >
            Name
          </span>
          <input
            className={`properties__input ${isPeerNameMissing ? "properties__required-outline" : ""}`}
            type="text"
            value={selectedPeer.name}
            onChange={(event) => updatePeer({ name: event.target.value })}
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
                value={selectedPeer.x}
                onChange={(event) =>
                  updatePeer({
                    x: parseNumberValue(event.target.value, selectedPeer.x),
                  })
                }
              />
            </div>
            <div className="properties__input-with-icon">
              <span className="properties__input-icon">Y</span>
              <input
                className="properties__input"
                type="number"
                value={selectedPeer.y}
                onChange={(event) =>
                  updatePeer({
                    y: parseNumberValue(event.target.value, selectedPeer.y),
                  })
                }
              />
            </div>
          </div>
        </label>

        <div className="properties__field-grid properties__field-grid--two">
          <label className="properties__field">
            <span className="properties__field-label">Range</span>
            <div className="properties__input-with-prefix">
              <CircleDot size={12} />
              <input
                className="properties__input"
                type="number"
                min="1"
                value={selectedPeer.range}
                onChange={(event) =>
                  updatePeer({
                    range: parsePositiveNumberValue(event.target.value, selectedPeer.range),
                  })
                }
              />
            </div>
          </label>

          <label className="properties__field">
            <span className="properties__field-label">Status</span>
            <button
              className="properties__status"
              type="button"
              onClick={() => updatePeer({ enabled: !selectedPeer.enabled })}
            >
              <Diamond size={12} />
              {selectedPeer.enabled ? "Enabled" : "Disabled"}
            </button>
          </label>
        </div>
      </section>

      <section className="properties__section">
        <p className="properties__section-title">Routing</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isProtocolMissing ? "properties__field-label--required" : ""}`}
          >
            Protocol
          </span>
          <div
            className={`properties__protocols ${isProtocolMissing ? "properties__required-outline" : ""}`}
          >
            {PROTOCOLS.map((protocol) => {
              const isActive = selectedPeer.protocols.includes(protocol);
              return (
                <button
                  className={`properties__protocol ${
                    isActive ? "properties__protocol--active" : ""
                  }`}
                  key={protocol}
                  type="button"
                  onClick={() => {
                    const next = isActive
                      ? selectedPeer.protocols.filter((p) => p !== protocol)
                      : [...selectedPeer.protocols, protocol];
                    updatePeer({ protocols: next });
                  }}
                >
                  {protocol}
                </button>
              );
            })}
          </div>
        </label>

        {selectedPeer.protocols.includes("BATMAN") && (
          <>
            <label className="properties__field">
              <span
                className={`properties__field-label ${isBatmanOgmMissing ? "properties__field-label--required" : ""}`}
              >
                BATMAN OGM Interval
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanOgmMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={selectedPeer.batmanOgmInterval}
                  onChange={(event) =>
                    updatePeer({
                      batmanOgmInterval: parseNumberValue(
                        event.target.value,
                        selectedPeer.batmanOgmInterval,
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              <span
                className={`properties__field-label ${isBatmanPurgeMissing ? "properties__field-label--required" : ""}`}
              >
                BATMAN Purge Timeout
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanPurgeMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={selectedPeer.batmanPurgeTimeout}
                  onChange={(event) =>
                    updatePeer({
                      batmanPurgeTimeout: parseNumberValue(
                        event.target.value,
                        selectedPeer.batmanPurgeTimeout,
                      ),
                    })
                  }
                />
              </div>
            </label>
          </>
        )}
      </section>
    </aside>
  );
}
