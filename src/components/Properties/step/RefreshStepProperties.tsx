import { Clock3, ExternalLink, Lock, Radio, RotateCw } from "lucide-react";

import { ui } from "../../../i18n/messages";
import type { RefreshStepPropertiesPanelProps } from "../../../types/properties";

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
        <p className="properties__title">{ui.properties.titleRoutingStep}</p>
        <p className="properties__subtitle">{ui.properties.subtitleRoutingStep}</p>
        <a className="properties__read-more" href="#" tabIndex={0}>
          <ExternalLink size={12} />
          {ui.common.readMore}
        </a>
      </header>

      <div className="properties__locked-notice">
        <Lock size={12} />
        {ui.properties.stepLockedNotice}
      </div>

      <section className="properties__section">
        <p className="properties__section-title">{ui.properties.sectionConfiguration}</p>

        <label className="properties__field">
          <span className="properties__field-label">{ui.properties.fieldName}</span>
          <input className="properties__input" type="text" value={selectedStep.title} disabled />
        </label>

        <div className="properties__inline-group">
          <label className="properties__field">
            <span className="properties__field-label">{ui.properties.fieldPeer}</span>
            <div className="properties__input-with-prefix">
              <Radio size={12} />
              <input
                className="properties__input"
                type="text"
                value={refreshPeer?.name ?? ui.properties.unknownPeer}
                disabled
              />
            </div>
          </label>

          <label className="properties__field">
            <span className="properties__field-label">{ui.properties.fieldProtocol}</span>
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
            <span className="properties__field-label">{ui.properties.fieldStartTick}</span>
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
            <span className="properties__field-label">{ui.properties.fieldInterval}</span>
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
