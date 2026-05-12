import { Clock3, ExternalLink, Lock, Radio, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import type { RefreshStepPropertiesPanelProps } from "../../../../../shared/types/properties";

export default function RefreshStepProperties({
  widthPercent,
  onResizeStart,
  selectedStep,
  peers,
}: RefreshStepPropertiesPanelProps) {
  const refreshPeer = peers.find((peer) => peer.id === selectedStep.refreshPeerId) ?? null;

  return (
    <aside className="properties properties--locked" style={{ width: `${widthPercent}%` }}>
      <div className="properties__resizer" onPointerDown={onResizeStart} />
      <header className="properties__header">
        <p className="properties__title">{"Routing Step"}</p>
        <p className="properties__subtitle">{"Auto-generated intervaled routing refresh step for peer protocol state synchronization."}</p>
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {"Read more"}
        </Link>
      </header>

      <div className="properties__locked-notice">
        <Lock size={12} />
        {"This step is unmodifiable."}
      </div>

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <label className="properties__field">
          <span className="properties__field-label">{"Name"}</span>
          <input className="properties__input" type="text" value={selectedStep.title} disabled />
        </label>

        <div className="properties__inline-group">
          <label className="properties__field">
            <span className="properties__field-label">{"Peer"}</span>
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
            <span className="properties__field-label">{"Protocol"}</span>
            <input
              className="properties__input"
              type="text"
              value={selectedStep.refreshProtocol}
              disabled
            />
          </label>
        </div>

        <div className="properties__inline-group">
          <label className="properties__field">
            <span className="properties__field-label">{"Start tick"}</span>
            <div className="properties__input-with-prefix">
              <Clock3 size={12} />
              <input
                className="properties__input"
                type="number"
                value={selectedStep.refreshStartTick}
                disabled
              />
            </div>
          </label>

          <label className="properties__field">
            <span className="properties__field-label">{"Interval"}</span>
            <div className="properties__input-with-prefix">
              <RotateCw size={12} />
              <input
                className="properties__input"
                type="number"
                value={selectedStep.refreshInterval}
                disabled
              />
            </div>
          </label>
        </div>
      </section>
    </aside>
  );
}
