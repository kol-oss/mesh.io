import { CircleDot, Clock3, Diamond, ExternalLink } from "lucide-react";

import { useSidebarResize } from "../../hooks/navigation/useSidebarResize";
import type { NetworkEntity, PeerEntity, PeerRoutingProtocol } from "../../types/navigation";

type PropertiesProps = {
  selectedId: string | null;
  selectedSource: "entities" | "steps" | null;
  entities: NetworkEntity[];
  setEntities: (value: NetworkEntity[]) => void;
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
}: PropertiesProps) {
  const { widthPercent, onResizeStart } = useSidebarResize({ side: "right" });

  if (!selectedId || !selectedSource) {
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
      description: "A directional or bidirectional connection between two nodes in the network.",
    },
    OBSTACLE: {
      title: "Obstacle",
      description: "A physical barrier that blocks signal propagation between nearby nodes.",
    },
  };

  const { title: entityTitle, description: entityDescription } = entityHeader[selectedEntity.type];

  if (selectedEntity.type !== "PEER") {
    return (
      <aside className="properties" style={{ width: `${widthPercent}%` }}>
        <div className="properties__resizer" onPointerDown={onResizeStart} />
        <header className="properties__header">
          <p className="properties__title">{entityTitle}</p>
          <p className="properties__subtitle">{entityDescription}</p>
          <a className="properties__read-more" href="#" tabIndex={0}>
            <ExternalLink size={12} />
            Read more
          </a>
        </header>
        <section className="properties__section">
          <p className="properties__section-title">Information</p>
          <p className="properties__placeholder">
            Properties for this entity type are not implemented yet.
          </p>
        </section>
      </aside>
    );
  }

  const selectedPeer: PeerEntity = selectedEntity;

  const updatePeer = (changes: Partial<PeerEntity>) => {
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
    <aside className="properties" style={{ width: `${widthPercent}%` }}>
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
            {PROTOCOLS.map((protocol) => (
              <button
                className={`properties__protocol ${
                  selectedPeer.protocol === protocol ? "properties__protocol--active" : ""
                }`}
                key={protocol}
                type="button"
                onClick={() => updatePeer({ protocol })}
              >
                {protocol}
              </button>
            ))}
          </div>
        </label>

        {selectedPeer.protocol === "BATMAN" && (
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
