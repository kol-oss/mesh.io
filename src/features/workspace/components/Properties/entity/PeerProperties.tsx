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
import { Link } from "react-router-dom";

import { peerRoutingProtocols } from "../../../../../shared/constants/protocol";
import {
  BATMAN_MIN_OGM_INTERVAL,
  BATMAN_MIN_ELP_INTERVAL,
  BATMAN_MIN_PURGE_TIMEOUT,
  BATMAN_MIN_DISTANCE_PENALTY,
  BATMAN_MIN_PENALTY_PERCENT,
} from "../../../../../shared/constants/batman";
import {
  AODV_MAX_HELLO_INTERVAL,
  AODV_MAX_ROUTE_TIMEOUT,
  AODV_MIN_HELLO_INTERVAL,
  AODV_MIN_ROUTE_TIMEOUT,
} from "../../../../../shared/constants/aodv";
import {
  DSDV_MAX_INTERVAL,
  DSDV_MAX_TIMEOUT,
  DSDV_MIN_INTERVAL,
  DSDV_MIN_TIMEOUT,
} from "../../../../../shared/constants/dsdv";
import { OLSR_MAX_INTERVAL, OLSR_MIN_INTERVAL } from "../../../../../shared/constants/olsr";
import Tooltip from "../../../../../shared/ui/components/Tooltip/Tooltip";
import { ui } from "../../../../../shared/i18n/messages";
import { EntityType, RoutingProtocol } from "../../../../../shared/types/enums";
import type { PeerEntity } from "../../../../../shared/types/entities";
import type { PeerPropertiesPanelProps } from "../../../../../shared/types/properties";
import { parseNumberValue, parsePositiveNumberValue } from "../../../../../shared/utils/properties";

const protocols = peerRoutingProtocols;

export default function PeerProperties({
  widthPercent,
  onResizeStart,
  selected: selectedPeer,
  entities,
  setEntities,
  title,
  description,
}: PeerPropertiesPanelProps) {
  const isLocked = selectedPeer.locked === true;
  const selectedProtocol = selectedPeer.protocols[0] ?? null;
  const isPeerNameMissing = selectedPeer.name.trim() === "";
  const isProtocolMissing = selectedPeer.protocols.length !== 1;
  const isBatmanOgmMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    selectedPeer.batmanOgmInterval < BATMAN_MIN_OGM_INTERVAL;
  const isBatmanElpMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    selectedPeer.batmanElpInterval < BATMAN_MIN_ELP_INTERVAL;
  const isBatmanPurgeMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    selectedPeer.batmanPurgeTimeout < BATMAN_MIN_PURGE_TIMEOUT;
  const isBatmanPenaltyDistanceMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    selectedPeer.batmanDistancePenaltyDistance < BATMAN_MIN_DISTANCE_PENALTY;
  const isBatmanPenaltyPercentMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    selectedPeer.batmanDistancePenaltyPercent < BATMAN_MIN_PENALTY_PERCENT;
  const isDsdvIncrementalMissing =
    selectedProtocol === RoutingProtocol.DSDV &&
    selectedPeer.dsdvIncrementalUpdateInterval < DSDV_MIN_INTERVAL;
  const isDsdvFullDumpMissing =
    selectedProtocol === RoutingProtocol.DSDV &&
    selectedPeer.dsdvFullDumpInterval < DSDV_MIN_INTERVAL;
  const isDsdvRouteTimeoutMissing =
    selectedProtocol === RoutingProtocol.DSDV && selectedPeer.dsdvRouteTimeout < DSDV_MIN_TIMEOUT;
  const isAodvHelloMissing =
    selectedProtocol === RoutingProtocol.AODV &&
    selectedPeer.aodvHelloInterval < AODV_MIN_HELLO_INTERVAL;
  const isAodvRouteTimeoutMissing =
    selectedProtocol === RoutingProtocol.AODV &&
    selectedPeer.aodvRouteTimeout < AODV_MIN_ROUTE_TIMEOUT;
  const isOlsrHelloMissing =
    selectedProtocol === RoutingProtocol.OLSR && selectedPeer.olsrHelloInterval < OLSR_MIN_INTERVAL;
  const isOlsrTcMissing =
    selectedProtocol === RoutingProtocol.OLSR && selectedPeer.olsrTcInterval < OLSR_MIN_INTERVAL;

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

  const updateDsdvPeers = (changes: Partial<PeerEntity>) => {
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

  const updateOlsrPeers = (changes: Partial<PeerEntity>) => {
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

  const updateAodvPeers = (changes: Partial<PeerEntity>) => {
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

  const renderGlobalLabel = (label: string, isRequired: boolean) => (
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
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {ui.common.readMore}
        </Link>
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
              const isActive = selectedProtocol === protocol;
              return (
                <button
                  className={`properties__protocol ${isActive ? "properties__protocol--active" : ""}`}
                  key={protocol}
                  type="button"
                  onClick={() => updatePeer({ protocols: [protocol] })}
                >
                  {protocol}
                </button>
              );
            })}
          </div>
        </label>

        {selectedProtocol === RoutingProtocol.BATMAN && (
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
              <span
                className={`properties__field-label ${isBatmanElpMissing ? "properties__field-label--required" : ""}`}
              >
                {ui.properties.fieldBatmanElpInterval}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanElpMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={selectedPeer.batmanElpInterval}
                  onChange={(event) =>
                    updatePeer({
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
              <span
                className={`properties__field-label ${isBatmanOgmMissing ? "properties__field-label--required" : ""}`}
              >
                {ui.properties.fieldBatmanOgmInterval}
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
                {ui.properties.fieldBatmanPurgeTimeout}
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

        {selectedProtocol === RoutingProtocol.DSDV && (
          <>
            <label className="properties__field">
              {renderGlobalLabel(
                ui.properties.fieldDsdvIncrementalInterval,
                isDsdvIncrementalMissing,
              )}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isDsdvIncrementalMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={DSDV_MIN_INTERVAL}
                  max={DSDV_MAX_INTERVAL}
                  value={selectedPeer.dsdvIncrementalUpdateInterval}
                  onChange={(event) =>
                    updateDsdvPeers({
                      dsdvIncrementalUpdateInterval: Math.max(
                        DSDV_MIN_INTERVAL,
                        Math.min(
                          DSDV_MAX_INTERVAL,
                          parseNumberValue(
                            event.target.value,
                            selectedPeer.dsdvIncrementalUpdateInterval,
                          ),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              {renderGlobalLabel(ui.properties.fieldDsdvFullDumpInterval, isDsdvFullDumpMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isDsdvFullDumpMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={DSDV_MIN_INTERVAL}
                  max={DSDV_MAX_INTERVAL}
                  value={selectedPeer.dsdvFullDumpInterval}
                  onChange={(event) =>
                    updateDsdvPeers({
                      dsdvFullDumpInterval: Math.max(
                        DSDV_MIN_INTERVAL,
                        Math.min(
                          DSDV_MAX_INTERVAL,
                          parseNumberValue(event.target.value, selectedPeer.dsdvFullDumpInterval),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              <span
                className={`properties__field-label ${isDsdvRouteTimeoutMissing ? "properties__field-label--required" : ""}`}
              >
                {ui.properties.fieldDsdvRouteTimeout}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isDsdvRouteTimeoutMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={DSDV_MIN_TIMEOUT}
                  max={DSDV_MAX_TIMEOUT}
                  value={selectedPeer.dsdvRouteTimeout}
                  onChange={(event) =>
                    updatePeer({
                      dsdvRouteTimeout: Math.max(
                        DSDV_MIN_TIMEOUT,
                        Math.min(
                          DSDV_MAX_TIMEOUT,
                          parseNumberValue(event.target.value, selectedPeer.dsdvRouteTimeout),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>
          </>
        )}

        {selectedProtocol === RoutingProtocol.OLSR && (
          <>
            <label className="properties__field">
              {renderGlobalLabel(ui.properties.fieldOlsrHelloInterval, isOlsrHelloMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isOlsrHelloMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={OLSR_MIN_INTERVAL}
                  max={OLSR_MAX_INTERVAL}
                  value={selectedPeer.olsrHelloInterval}
                  onChange={(event) =>
                    updateOlsrPeers({
                      olsrHelloInterval: Math.max(
                        OLSR_MIN_INTERVAL,
                        Math.min(
                          OLSR_MAX_INTERVAL,
                          parseNumberValue(event.target.value, selectedPeer.olsrHelloInterval),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              {renderGlobalLabel(ui.properties.fieldOlsrTcInterval, isOlsrTcMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isOlsrTcMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={OLSR_MIN_INTERVAL}
                  max={OLSR_MAX_INTERVAL}
                  value={selectedPeer.olsrTcInterval}
                  onChange={(event) =>
                    updateOlsrPeers({
                      olsrTcInterval: Math.max(
                        OLSR_MIN_INTERVAL,
                        Math.min(
                          OLSR_MAX_INTERVAL,
                          parseNumberValue(event.target.value, selectedPeer.olsrTcInterval),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>
          </>
        )}

        {selectedProtocol === RoutingProtocol.AODV && (
          <>
            <label className="properties__field">
              {renderGlobalLabel(ui.properties.fieldAodvHelloInterval, isAodvHelloMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isAodvHelloMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={AODV_MIN_HELLO_INTERVAL}
                  max={AODV_MAX_HELLO_INTERVAL}
                  value={selectedPeer.aodvHelloInterval}
                  onChange={(event) =>
                    updateAodvPeers({
                      aodvHelloInterval: Math.max(
                        AODV_MIN_HELLO_INTERVAL,
                        Math.min(
                          AODV_MAX_HELLO_INTERVAL,
                          parseNumberValue(event.target.value, selectedPeer.aodvHelloInterval),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              <span
                className={`properties__field-label ${isAodvRouteTimeoutMissing ? "properties__field-label--required" : ""}`}
              >
                {ui.properties.fieldAodvRouteTimeout}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isAodvRouteTimeoutMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={AODV_MIN_ROUTE_TIMEOUT}
                  max={AODV_MAX_ROUTE_TIMEOUT}
                  value={selectedPeer.aodvRouteTimeout}
                  onChange={(event) =>
                    updatePeer({
                      aodvRouteTimeout: Math.max(
                        AODV_MIN_ROUTE_TIMEOUT,
                        Math.min(
                          AODV_MAX_ROUTE_TIMEOUT,
                          parseNumberValue(event.target.value, selectedPeer.aodvRouteTimeout),
                        ),
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
