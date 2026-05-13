import { Diamond, ExternalLink, Lock, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { EntityType } from "../../../../../shared/types/model/entities";
import type { LinkEntity, PeerEntity } from "../../../../../shared/types/model/entities";
import type { LinkPropertiesPanelProps } from "../../../../../shared/types/view/properties";
import Select from "../../../../../shared/components/Select/Select";
import type { UUID } from "../../../../../shared/types/common/uuid";

export default function LinkProperties({
  widthPercent,
  onResizeStart,
  selected: selectedLink,
  entities,
  setEntities,
  title,
  description,
}: LinkPropertiesPanelProps) {
  const isLocked = selectedLink.locked === true;
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);

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
      if (entity.id !== selectedLink.id || entity.type !== EntityType.Link) {
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
        aria-label={"Resize properties"}
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
      />

      <header className="properties__header">
        <p className="properties__title">{title}</p>
        <p className="properties__subtitle">{description}</p>
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {"Read more"}
        </Link>
      </header>

      {isLocked && (
        <div className="properties__locked-notice">
          <Lock size={12} />
          {"This entity is unmodifiable."}
        </div>
      )}

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isLinkNameMissing ? "properties__field-label--required" : ""}`}
          >
            {"Name"}
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
                {"Source"}
              </span>
              <Select
                value={sourceValue}
                invalid={isLinkSourceMissing}
                options={linkPeerOptions}
                onChange={(value) => {
                  const nextSource = (value as UUID) || null;
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
                {"Destination"}
              </span>
              <Select
                value={destinationValue}
                invalid={isLinkDestinationMissing}
                options={linkPeerOptions.filter((peer) => peer.value !== sourceValue)}
                onChange={(value) => {
                  const nextDestination = (value as UUID) || null;
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
          <span className="properties__field-label">{"Status"}</span>
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
