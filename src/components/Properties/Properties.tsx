import {
  Activity,
  ChevronsRight,
  CircleDot,
  Clock3,
  Diamond,
  ExternalLink,
  Lock,
  Mail,
  MoveHorizontal,
  MoveVertical,
  Radio,
} from "lucide-react";

import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import type {
  LinkEntity,
  NetworkEntity,
  ObstacleEntity,
  PeerEntity,
  PeerRoutingProtocol,
} from "../../types/navigation";
import type { WorkflowStep } from "../../types/steps";

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
const STEP_TYPES: Array<{ value: WorkflowStep["type"]; label: string }> = [
  { value: "MOVE", label: "Move" },
  { value: "MESSAGE", label: "Message" },
  { value: "TOGGLE", label: "Toggle" },
];

const parseNumberValue = (value: string, fallback: number) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
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
    const toggleTargets = entities.filter(
      (entity): entity is PeerEntity | LinkEntity =>
        entity.type === "PEER" || entity.type === "LINK",
    );

    const selectedTypeIcon = {
      MESSAGE: <Mail size={12} />,
      TOGGLE: <Activity size={12} />,
      MOVE: <ChevronsRight size={12} />,
    }[selectedStep.type];

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
            <span className="properties__field-label">Name</span>
            <input
              className="properties__input"
              type="text"
              value={selectedStep.title}
              onChange={(event) => updateStep({ title: event.target.value })}
            />
          </label>

          <div className="properties__field">
            <div className="properties__inline-group">
              <label className="properties__field">
                <span className="properties__field-label">Type</span>
                <div className="properties__input-with-prefix">
                  {selectedTypeIcon}
                  <select
                    className="properties__input"
                    value={selectedStep.type}
                    onChange={(event) => {
                      const nextType = event.target.value as WorkflowStep["type"];

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
                  >
                    {STEP_TYPES.map((stepType) => (
                      <option key={stepType.value} value={stepType.value}>
                        {stepType.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <span className="properties__field-label">Source</span>
                  <div className="properties__input-with-prefix">
                    <Radio size={12} />
                    <select
                      className={`properties__input ${messageSourceValue ? "" : "properties__input--placeholder"}`}
                      value={messageSourceValue}
                      onChange={(event) => {
                        const nextSource = event.target.value || null;
                        const nextDestination =
                          nextSource && selectedStep.destinationPeerId === nextSource
                            ? null
                            : selectedStep.destinationPeerId;

                        updateStep({
                          sourcePeerId: nextSource,
                          destinationPeerId: nextDestination,
                        });
                      }}
                    >
                      <option value="">Select</option>
                      {peers.map((peer) => (
                        <option key={peer.id} value={peer.id}>
                          {peer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="properties__field">
                  <span className="properties__field-label">Destination</span>
                  <div className="properties__input-with-prefix">
                    <Radio size={12} />
                    <select
                      className={`properties__input ${messageDestinationValue ? "" : "properties__input--placeholder"}`}
                      value={messageDestinationValue}
                      onChange={(event) => {
                        const nextDestination = event.target.value || null;
                        if (nextDestination && nextDestination === messageSourceValue) {
                          return;
                        }
                        updateStep({ destinationPeerId: nextDestination });
                      }}
                    >
                      <option value="">Select</option>
                      {peers
                        .filter((peer) => peer.id !== messageSourceValue)
                        .map((peer) => (
                          <option key={peer.id} value={peer.id}>
                            {peer.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedStep.type === "TOGGLE" && (
            <div className="properties__field">
              <div className="properties__inline-group">
                <div className="properties__field">
                  <span className="properties__field-label">Entity</span>
                  <div className="properties__input-with-prefix">
                    <Diamond size={12} />
                    <select
                      className={`properties__input ${toggleTargetValue ? "" : "properties__input--placeholder"}`}
                      value={toggleTargetValue}
                      onChange={(event) =>
                        updateStep({ targetEntityId: event.target.value || null })
                      }
                    >
                      <option value="">Select</option>
                      {toggleTargets.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="properties__field">
                  <span className="properties__field-label">New status</span>
                  <button className="properties__status" type="button" disabled>
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
                <span className="properties__field-label">Entity</span>
                <div className="properties__input-with-prefix">
                  <Radio size={12} />
                  <select
                    className={`properties__input ${moveTargetValue ? "" : "properties__input--placeholder"}`}
                    value={moveTargetValue}
                    onChange={(event) => {
                      const nextMovePeerId = event.target.value || null;
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
                  >
                    <option value="">Select</option>
                    {peers.map((peer) => (
                      <option key={peer.id} value={peer.id}>
                        {peer.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                        updateStep({ x: parseNumberValue(event.target.value, selectedStep.x) })
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
                        updateStep({ y: parseNumberValue(event.target.value, selectedStep.y) })
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
            <span className="properties__field-label">Name</span>
            <input
              className="properties__input"
              type="text"
              value={selectedLink.name}
              onChange={(event) => updateLink({ name: event.target.value })}
            />
          </label>

          <div className="properties__field">
            <div className="properties__inline-group">
              <div className="properties__field">
                <span className="properties__field-label">Source</span>
                <div className="properties__input-with-prefix">
                  <Radio size={12} />
                  <select
                    className={`properties__input ${sourceValue ? "" : "properties__input--placeholder"}`}
                    value={sourceValue}
                    onChange={(event) => {
                      const nextSource = event.target.value || null;
                      const nextDestination =
                        nextSource && selectedLink.destinationPeerId === nextSource
                          ? null
                          : selectedLink.destinationPeerId;

                      updateLink({
                        sourcePeerId: nextSource,
                        destinationPeerId: nextDestination,
                      });
                    }}
                  >
                    <option value="">Select</option>
                    {peers.map((peer) => (
                      <option key={peer.id} value={peer.id}>
                        {peer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="properties__field">
                <span className="properties__field-label">Destination</span>
                <div className="properties__input-with-prefix">
                  <Radio size={12} />
                  <select
                    className={`properties__input ${destinationValue ? "" : "properties__input--placeholder"}`}
                    value={destinationValue}
                    onChange={(event) => {
                      const nextDestination = event.target.value || null;
                      if (nextDestination && nextDestination === sourceValue) {
                        return;
                      }
                      updateLink({ destinationPeerId: nextDestination });
                    }}
                  >
                    <option value="">Select</option>
                    {peers
                      .filter((peer) => peer.id !== sourceValue)
                      .map((peer) => (
                        <option key={peer.id} value={peer.id}>
                          {peer.name}
                        </option>
                      ))}
                  </select>
                </div>
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
            <span className="properties__field-label">Name</span>
            <input
              className="properties__input"
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
                  min="0"
                  value={selectedObstacle.x}
                  onChange={(event) =>
                    updateObstacle({ x: parseNumberValue(event.target.value, selectedObstacle.x) })
                  }
                />
              </div>
              <div className="properties__input-with-icon">
                <span className="properties__input-icon">Y</span>
                <input
                  className="properties__input"
                  type="number"
                  min="0"
                  value={selectedObstacle.y}
                  onChange={(event) =>
                    updateObstacle({ y: parseNumberValue(event.target.value, selectedObstacle.y) })
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
          <span className="properties__field-label">Name</span>
          <input
            className="properties__input"
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
                min="0"
                value={selectedPeer.x}
                onChange={(event) =>
                  updatePeer({ x: parseNumberValue(event.target.value, selectedPeer.x) })
                }
              />
            </div>
            <div className="properties__input-with-icon">
              <span className="properties__input-icon">Y</span>
              <input
                className="properties__input"
                type="number"
                min="0"
                value={selectedPeer.y}
                onChange={(event) =>
                  updatePeer({ y: parseNumberValue(event.target.value, selectedPeer.y) })
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
                  updatePeer({ range: parseNumberValue(event.target.value, selectedPeer.range) })
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
          <span className="properties__field-label">Protocol</span>
          <div className="properties__protocols">
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
              <span className="properties__field-label">BATMAN OGM Interval</span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className="properties__input"
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
              <span className="properties__field-label">BATMAN Purge Timeout</span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className="properties__input"
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
