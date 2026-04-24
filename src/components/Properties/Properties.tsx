import {
  CircleDot,
  Clock3,
  Diamond,
  ExternalLink,
  Lock,
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

type PropertiesProps = {
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
  isNavCollapsed: boolean;
};

const PROTOCOLS: PeerRoutingProtocol[] = ["HWMP", "BATMAN", "OLSR", "AODV", "DSR"];

const parseNumberValue = (value: string, fallback: number) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

export default function Properties({
  selectedId,
  selectedSource,
  entities,
  setEntities,
  isNavCollapsed,
}: PropertiesProps) {
  const { widthPercent, onResizeStart } = useSidebarResize({ side: "right" });

  if (isNavCollapsed || !selectedId || !selectedSource) {
    return null;
  }

  if (selectedSource === "steps") {
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
          <p className="properties__section-title">Information</p>
          <p className="properties__placeholder">
            You selected a workflow step. Detailed step properties will be added in the next
            iteration.
          </p>
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
