import {
  CircleDot,
  Clock3,
  Diamond,
  ExternalLink,
  Globe,
  Lock,
  Percent,
  Ruler,
} from "lucide-react";

import { peerRoutingProtocols } from "../../../constants/protocol";
import Tooltip from "../../Tooltip/Tooltip";
import { ui } from "../../../i18n/messages";
import { EntityType, RoutingProtocol } from "../../../types/enums";
import type { PeerEntity } from "../../../types/entities";
import type { PeerPropertiesPanelProps } from "../../../types/properties";
import { parseNumberValue, parsePositiveNumberValue } from "../../../utils/properties";

const protocols = peerRoutingProtocols;

export default function PeerProperties({
  widthPercent,
  onResizeStart,
  selectedPeer,
  entities,
  setEntities,
  title,
  description,
}: PeerPropertiesPanelProps) {
  const isLocked = selectedPeer.locked === true;
  const isPeerNameMissing = selectedPeer.name.trim() === "";
  const isProtocolMissing = selectedPeer.protocols.length === 0;
  const isBatmanOgmMissing =
    selectedPeer.protocols.includes(RoutingProtocol.BATMAN) && selectedPeer.batmanOgmInterval <= 0;
  const isBatmanElpMissing =
    selectedPeer.protocols.includes(RoutingProtocol.BATMAN) && selectedPeer.batmanElpInterval <= 0;
  const isBatmanPurgeMissing =
    selectedPeer.protocols.includes(RoutingProtocol.BATMAN) && selectedPeer.batmanPurgeTimeout <= 0;
  const isBatmanPenaltyDistanceMissing =
    selectedPeer.protocols.includes(RoutingProtocol.BATMAN) &&
    selectedPeer.batmanDistancePenaltyDistance <= 0;
  const isBatmanPenaltyPercentMissing =
    selectedPeer.protocols.includes(RoutingProtocol.BATMAN) &&
    selectedPeer.batmanDistancePenaltyPercent < 0;

  const updatePeer = (changes: Partial<PeerEntity>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.id !== selectedPeer.id || entity.type !== EntityType.Peer) {
        return entity;
      }

      return {
        ...entity,
        ...changes,
      };
    });

    setEntities(updatedEntities);
  };

  const updateBatmanPeers = (changes: Partial<PeerEntity>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.type !== EntityType.Peer) {
        return entity;
      }

      return {
        ...entity,
        ...changes,
      };
    });

    setEntities(updatedEntities);
  };

  const renderBatmanLabel = (label: string, isRequired: boolean) => (
    <span className="properties__field-label properties__field-label--global">
      <span
        className={`properties__field-label-text ${isRequired ? "properties__field-label-text--required" : ""}`}
      >
        {label}
      </span>
      <Tooltip content={ui.properties.globalFieldTooltip}>
        <span
          className="properties__global-indicator"
          aria-label={ui.properties.globalFieldTooltip}
        >
          <Globe size={12} />
        </span>
      </Tooltip>
    </span>
  );

  return (
    <aside
      className={`properties ${isLocked ? "properties--locked" : ""}`}
      style={{ width: `${widthPercent}%` }}
    >
      <div
        className="properties__resizer"
        role="separator"
        aria-label={ui.properties.resizeAria}
        aria-orientation="vertical"
        onPointerDown={onResizeStart}
      />

      <header className="properties__header">
        <p className="properties__title">{title}</p>
        <p className="properties__subtitle">{description}</p>
        <a className="properties__read-more" href="#" tabIndex={0}>
          <ExternalLink size={12} />
          {ui.common.readMore}
        </a>
      </header>

      {isLocked && (
        <div className="properties__locked-notice">
          <Lock size={12} />
          {ui.properties.entityLockedNotice}
        </div>
      )}

      <section className="properties__section">
        <p className="properties__section-title">{ui.properties.sectionConfiguration}</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isPeerNameMissing ? "properties__field-label--required" : ""}`}
          >
            {ui.properties.fieldName}
          </span>
          <input
            className={`properties__input ${isPeerNameMissing ? "properties__required-outline" : ""}`}
            type="text"
            value={selectedPeer.name}
            onChange={(event) => updatePeer({ name: event.target.value })}
          />
        </label>

        <label className="properties__field">
          <span className="properties__field-label">{ui.properties.fieldPosition}</span>
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
            <span className="properties__field-label">{ui.properties.fieldRange}</span>
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
            <span className="properties__field-label">{ui.properties.fieldStatus}</span>
            <button
              className="properties__status"
              type="button"
              onClick={() => updatePeer({ enabled: !selectedPeer.enabled })}
            >
              <Diamond size={12} />
              {selectedPeer.enabled ? ui.common.enabled : ui.common.disabled}
            </button>
          </label>
        </div>
      </section>

      <section className="properties__section">
        <p className="properties__section-title">{ui.properties.sectionRouting}</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isProtocolMissing ? "properties__field-label--required" : ""}`}
          >
            {ui.properties.fieldProtocol}
          </span>
          <div
            className={`properties__protocols ${isProtocolMissing ? "properties__required-outline" : ""}`}
          >
            {protocols.map((protocol) => {
              const isActive = selectedPeer.protocols.includes(protocol);
              return (
                <button
                  className={`properties__protocol ${isActive ? "properties__protocol--active" : ""}`}
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

        {selectedPeer.protocols.includes(RoutingProtocol.BATMAN) && (
          <>
            <label className="properties__field">
              {renderBatmanLabel(
                ui.properties.fieldBatmanDistancePenalty,
                isBatmanPenaltyDistanceMissing || isBatmanPenaltyPercentMissing,
              )}
              <div className="properties__inline-group">
                <div className="properties__input-with-prefix">
                  <Ruler size={12} />
                  <input
                    className={`properties__input ${isBatmanPenaltyDistanceMissing ? "properties__required-outline" : ""}`}
                    type="number"
                    min="1"
                    value={selectedPeer.batmanDistancePenaltyDistance}
                    onChange={(event) =>
                      updateBatmanPeers({
                        batmanDistancePenaltyDistance: parsePositiveNumberValue(
                          event.target.value,
                          selectedPeer.batmanDistancePenaltyDistance,
                        ),
                      })
                    }
                    aria-label={ui.properties.fieldDistance}
                  />
                </div>
                <div className="properties__input-with-prefix">
                  <Percent size={12} />
                  <input
                    className={`properties__input ${isBatmanPenaltyPercentMissing ? "properties__required-outline" : ""}`}
                    type="number"
                    min="0"
                    value={selectedPeer.batmanDistancePenaltyPercent}
                    onChange={(event) =>
                      updateBatmanPeers({
                        batmanDistancePenaltyPercent: parsePositiveNumberValue(
                          event.target.value,
                          selectedPeer.batmanDistancePenaltyPercent,
                          0,
                        ),
                      })
                    }
                    aria-label={ui.properties.fieldPenaltyPercent}
                  />
                </div>
              </div>
            </label>

            <label className="properties__field">
              {renderBatmanLabel(ui.properties.fieldBatmanElpInterval, isBatmanElpMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanElpMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={selectedPeer.batmanElpInterval}
                  onChange={(event) =>
                    updateBatmanPeers({
                      batmanElpInterval: parseNumberValue(
                        event.target.value,
                        selectedPeer.batmanElpInterval,
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              {renderBatmanLabel(ui.properties.fieldBatmanOgmInterval, isBatmanOgmMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanOgmMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={selectedPeer.batmanOgmInterval}
                  onChange={(event) =>
                    updateBatmanPeers({
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
              {renderBatmanLabel(ui.properties.fieldBatmanPurgeTimeout, isBatmanPurgeMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanPurgeMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={selectedPeer.batmanPurgeTimeout}
                  onChange={(event) =>
                    updateBatmanPeers({
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
