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

import {
  getDefaultPeerConfiguration,
  peerRoutingProtocols,
} from "@/shared/constants/protocol";
import {
  BATMAN_MIN_OGM_INTERVAL,
  BATMAN_MIN_ELP_INTERVAL,
  BATMAN_MIN_PURGE_TIMEOUT,
  BATMAN_MIN_DISTANCE_PENALTY,
  BATMAN_MIN_PENALTY_PERCENT,
} from "@/shared/constants/batman";
import {
  AODV_MAX_HELLO_INTERVAL,
  AODV_MAX_ROUTE_TIMEOUT,
  AODV_MIN_HELLO_INTERVAL,
  AODV_MIN_ROUTE_TIMEOUT,
} from "@/shared/constants/aodv";
import {
  DSDV_MAX_INTERVAL,
  DSDV_MAX_TIMEOUT,
  DSDV_MIN_INTERVAL,
  DSDV_MIN_TIMEOUT,
} from "@/shared/constants/dsdv";
import { OLSR_MAX_INTERVAL, OLSR_MIN_INTERVAL } from "@/shared/constants/olsr";
import Tooltip from "@/shared/components/Tooltip/Tooltip";
import { EntityType } from "@/shared/types/model/entities";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type {
  AodvConfiguration,
  BatmanConfiguration,
  DsdvConfiguration,
  OlsrConfiguration,
} from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import {
  getAodvConfiguration,
  getBatmanConfiguration,
  getDsdvConfiguration,
  getOlsrConfiguration,
} from "@/shared/types/model/peers";
import type { PeerPropertiesPanelProps } from "@/shared/types/view/properties";
import { parseNumberValue, parsePositiveNumberValue } from "@/shared/utils/properties";

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
  const selectedProtocol = selectedPeer.protocol;
  const batmanConfiguration = getBatmanConfiguration(selectedPeer);
  const dsdvConfiguration = getDsdvConfiguration(selectedPeer);
  const aodvConfiguration = getAodvConfiguration(selectedPeer);
  const olsrConfiguration = getOlsrConfiguration(selectedPeer);
  const isPeerNameMissing = selectedPeer.name.trim() === "";
  const isProtocolMissing = false;
  const isBatmanOgmMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    (batmanConfiguration?.ogmInterval ?? 0) < BATMAN_MIN_OGM_INTERVAL;
  const isBatmanElpMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    (batmanConfiguration?.elpInterval ?? 0) < BATMAN_MIN_ELP_INTERVAL;
  const isBatmanPurgeMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    (batmanConfiguration?.purgeTimeout ?? 0) < BATMAN_MIN_PURGE_TIMEOUT;
  const isBatmanPenaltyDistanceMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    (batmanConfiguration?.distancePenaltyDistance ?? 0) < BATMAN_MIN_DISTANCE_PENALTY;
  const isBatmanPenaltyPercentMissing =
    selectedProtocol === RoutingProtocol.BATMAN &&
    (batmanConfiguration?.distancePenaltyPercent ?? 0) < BATMAN_MIN_PENALTY_PERCENT;
  const isDsdvIncrementalMissing =
    selectedProtocol === RoutingProtocol.DSDV &&
    (dsdvConfiguration?.incrementalUpdateInterval ?? 0) < DSDV_MIN_INTERVAL;
  const isDsdvFullDumpMissing =
    selectedProtocol === RoutingProtocol.DSDV &&
    (dsdvConfiguration?.fullDumpInterval ?? 0) < DSDV_MIN_INTERVAL;
  const isDsdvRouteTimeoutMissing =
    selectedProtocol === RoutingProtocol.DSDV &&
    (dsdvConfiguration?.routeTimeout ?? 0) < DSDV_MIN_TIMEOUT;
  const isAodvHelloMissing =
    selectedProtocol === RoutingProtocol.AODV &&
    (aodvConfiguration?.helloInterval ?? 0) < AODV_MIN_HELLO_INTERVAL;
  const isAodvRouteTimeoutMissing =
    selectedProtocol === RoutingProtocol.AODV &&
    (aodvConfiguration?.routeTimeout ?? 0) < AODV_MIN_ROUTE_TIMEOUT;
  const isOlsrHelloMissing =
    selectedProtocol === RoutingProtocol.OLSR &&
    (olsrConfiguration?.helloInterval ?? 0) < OLSR_MIN_INTERVAL;
  const isOlsrTcMissing =
    selectedProtocol === RoutingProtocol.OLSR &&
    (olsrConfiguration?.tcInterval ?? 0) < OLSR_MIN_INTERVAL;

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

  const updateBatmanPeers = (changes: Partial<BatmanConfiguration>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.type !== EntityType.Peer || entity.protocol !== RoutingProtocol.BATMAN) {
        return entity;
      }

      const configuration = getBatmanConfiguration(entity);
      if (!configuration) {
        return entity;
      }

      return {
        ...entity,
        configuration: {
          ...configuration,
          ...changes,
        },
      };
    });

    setEntities(updatedEntities);
  };

  const updateDsdvPeers = (changes: Partial<DsdvConfiguration>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.type !== EntityType.Peer || entity.protocol !== RoutingProtocol.DSDV) {
        return entity;
      }

      const configuration = getDsdvConfiguration(entity);
      if (!configuration) {
        return entity;
      }

      return {
        ...entity,
        configuration: {
          ...configuration,
          ...changes,
        },
      };
    });

    setEntities(updatedEntities);
  };

  const updateOlsrPeers = (changes: Partial<OlsrConfiguration>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.type !== EntityType.Peer || entity.protocol !== RoutingProtocol.OLSR) {
        return entity;
      }

      const configuration = getOlsrConfiguration(entity);
      if (!configuration) {
        return entity;
      }

      return {
        ...entity,
        configuration: {
          ...configuration,
          ...changes,
        },
      };
    });

    setEntities(updatedEntities);
  };

  const updateAodvPeers = (changes: Partial<AodvConfiguration>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.type !== EntityType.Peer || entity.protocol !== RoutingProtocol.AODV) {
        return entity;
      }

      const configuration = getAodvConfiguration(entity);
      if (!configuration) {
        return entity;
      }

      return {
        ...entity,
        configuration: {
          ...configuration,
          ...changes,
        },
      };
    });

    setEntities(updatedEntities);
  };

  const updateBatmanPeer = (changes: Partial<BatmanConfiguration>) => {
    if (!batmanConfiguration) {
      return;
    }

    updatePeer({
      configuration: {
        ...batmanConfiguration,
        ...changes,
      },
    });
  };

  const updateDsdvPeer = (changes: Partial<DsdvConfiguration>) => {
    if (!dsdvConfiguration) {
      return;
    }

    updatePeer({
      configuration: {
        ...dsdvConfiguration,
        ...changes,
      },
    });
  };

  const updateAodvPeer = (changes: Partial<AodvConfiguration>) => {
    if (!aodvConfiguration) {
      return;
    }

    updatePeer({
      configuration: {
        ...aodvConfiguration,
        ...changes,
      },
    });
  };

  const renderBatmanLabel = (label: string, isRequired: boolean) => (
    <span className="properties__field-label properties__field-label--global">
      <span
        className={`properties__field-label-text ${isRequired ? "properties__field-label-text--required" : ""}`}
      >
        {label}
      </span>
      <Tooltip content={"Global field"}>
        <span className="properties__global-indicator" aria-label={"Global field"}>
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
      <Tooltip content={"Global field"}>
        <span className="properties__global-indicator" aria-label={"Global field"}>
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
            className={`properties__field-label ${isPeerNameMissing ? "properties__field-label--required" : ""}`}
          >
            {"Name"}
          </span>
          <input
            className={`properties__input ${isPeerNameMissing ? "properties__required-outline" : ""}`}
            type="text"
            value={selectedPeer.name}
            onChange={(event) => updatePeer({ name: event.target.value })}
          />
        </label>

        <label className="properties__field">
          <span className="properties__field-label">{"Position"}</span>
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
            <span className="properties__field-label">{"Range"}</span>
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
            <span className="properties__field-label">{"Status"}</span>
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
        <p className="properties__section-title">{"Routing"}</p>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isProtocolMissing ? "properties__field-label--required" : ""}`}
          >
            {"Protocol"}
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
                  onClick={() =>
                    updatePeer({
                      protocol,
                      configuration: getDefaultPeerConfiguration(protocol),
                    })
                  }
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
                "Distance Penalty",
                isBatmanPenaltyDistanceMissing || isBatmanPenaltyPercentMissing,
              )}
              <div className="properties__inline-group">
                <div className="properties__input-with-prefix">
                  <Ruler size={12} />
                  <input
                    className={`properties__input ${isBatmanPenaltyDistanceMissing ? "properties__required-outline" : ""}`}
                    type="number"
                    min="1"
                    value={
                      batmanConfiguration?.distancePenaltyDistance ?? BATMAN_MIN_DISTANCE_PENALTY
                    }
                    onChange={(event) =>
                      updateBatmanPeers({
                        distancePenaltyDistance: parsePositiveNumberValue(
                          event.target.value,
                          batmanConfiguration?.distancePenaltyDistance ??
                            BATMAN_MIN_DISTANCE_PENALTY,
                        ),
                      })
                    }
                    aria-label={"Distance"}
                  />
                </div>
                <div className="properties__input-with-prefix">
                  <Percent size={12} />
                  <input
                    className={`properties__input ${isBatmanPenaltyPercentMissing ? "properties__required-outline" : ""}`}
                    type="number"
                    min="0"
                    value={
                      batmanConfiguration?.distancePenaltyPercent ?? BATMAN_MIN_PENALTY_PERCENT
                    }
                    onChange={(event) =>
                      updateBatmanPeers({
                        distancePenaltyPercent: parsePositiveNumberValue(
                          event.target.value,
                          batmanConfiguration?.distancePenaltyPercent ?? BATMAN_MIN_PENALTY_PERCENT,
                          0,
                        ),
                      })
                    }
                    aria-label={"Percentage of penalty"}
                  />
                </div>
              </div>
            </label>

            <label className="properties__field">
              <span
                className={`properties__field-label ${isBatmanElpMissing ? "properties__field-label--required" : ""}`}
              >
                {"ELP Interval"}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanElpMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={batmanConfiguration?.elpInterval ?? BATMAN_MIN_ELP_INTERVAL}
                  onChange={(event) =>
                    updateBatmanPeer({
                      elpInterval: parseNumberValue(
                        event.target.value,
                        batmanConfiguration?.elpInterval ?? BATMAN_MIN_ELP_INTERVAL,
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
                {"OGM Interval"}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanOgmMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={batmanConfiguration?.ogmInterval ?? BATMAN_MIN_OGM_INTERVAL}
                  onChange={(event) =>
                    updateBatmanPeer({
                      ogmInterval: parseNumberValue(
                        event.target.value,
                        batmanConfiguration?.ogmInterval ?? BATMAN_MIN_OGM_INTERVAL,
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
                {"Purge Timeout"}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isBatmanPurgeMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min="1"
                  value={batmanConfiguration?.purgeTimeout ?? BATMAN_MIN_PURGE_TIMEOUT}
                  onChange={(event) =>
                    updateBatmanPeer({
                      purgeTimeout: parseNumberValue(
                        event.target.value,
                        batmanConfiguration?.purgeTimeout ?? BATMAN_MIN_PURGE_TIMEOUT,
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
              {renderGlobalLabel("Incremental Update Interval", isDsdvIncrementalMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isDsdvIncrementalMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={DSDV_MIN_INTERVAL}
                  max={DSDV_MAX_INTERVAL}
                  value={dsdvConfiguration?.incrementalUpdateInterval ?? DSDV_MIN_INTERVAL}
                  onChange={(event) =>
                    updateDsdvPeers({
                      incrementalUpdateInterval: Math.max(
                        DSDV_MIN_INTERVAL,
                        Math.min(
                          DSDV_MAX_INTERVAL,
                          parseNumberValue(
                            event.target.value,
                            dsdvConfiguration?.incrementalUpdateInterval ?? DSDV_MIN_INTERVAL,
                          ),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              {renderGlobalLabel("Full Dump Interval", isDsdvFullDumpMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isDsdvFullDumpMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={DSDV_MIN_INTERVAL}
                  max={DSDV_MAX_INTERVAL}
                  value={dsdvConfiguration?.fullDumpInterval ?? DSDV_MIN_INTERVAL}
                  onChange={(event) =>
                    updateDsdvPeers({
                      fullDumpInterval: Math.max(
                        DSDV_MIN_INTERVAL,
                        Math.min(
                          DSDV_MAX_INTERVAL,
                          parseNumberValue(
                            event.target.value,
                            dsdvConfiguration?.fullDumpInterval ?? DSDV_MIN_INTERVAL,
                          ),
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
                {"Route Timeout"}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isDsdvRouteTimeoutMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={DSDV_MIN_TIMEOUT}
                  max={DSDV_MAX_TIMEOUT}
                  value={dsdvConfiguration?.routeTimeout ?? DSDV_MIN_TIMEOUT}
                  onChange={(event) =>
                    updateDsdvPeer({
                      routeTimeout: Math.max(
                        DSDV_MIN_TIMEOUT,
                        Math.min(
                          DSDV_MAX_TIMEOUT,
                          parseNumberValue(
                            event.target.value,
                            dsdvConfiguration?.routeTimeout ?? DSDV_MIN_TIMEOUT,
                          ),
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
              {renderGlobalLabel("HELLO Interval", isOlsrHelloMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isOlsrHelloMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={OLSR_MIN_INTERVAL}
                  max={OLSR_MAX_INTERVAL}
                  value={olsrConfiguration?.helloInterval ?? OLSR_MIN_INTERVAL}
                  onChange={(event) =>
                    updateOlsrPeers({
                      helloInterval: Math.max(
                        OLSR_MIN_INTERVAL,
                        Math.min(
                          OLSR_MAX_INTERVAL,
                          parseNumberValue(
                            event.target.value,
                            olsrConfiguration?.helloInterval ?? OLSR_MIN_INTERVAL,
                          ),
                        ),
                      ),
                    })
                  }
                />
              </div>
            </label>

            <label className="properties__field">
              {renderGlobalLabel("TC Interval", isOlsrTcMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isOlsrTcMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={OLSR_MIN_INTERVAL}
                  max={OLSR_MAX_INTERVAL}
                  value={olsrConfiguration?.tcInterval ?? OLSR_MIN_INTERVAL}
                  onChange={(event) =>
                    updateOlsrPeers({
                      tcInterval: Math.max(
                        OLSR_MIN_INTERVAL,
                        Math.min(
                          OLSR_MAX_INTERVAL,
                          parseNumberValue(
                            event.target.value,
                            olsrConfiguration?.tcInterval ?? OLSR_MIN_INTERVAL,
                          ),
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
              {renderGlobalLabel("HELLO Interval", isAodvHelloMissing)}
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isAodvHelloMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={AODV_MIN_HELLO_INTERVAL}
                  max={AODV_MAX_HELLO_INTERVAL}
                  value={aodvConfiguration?.helloInterval ?? AODV_MIN_HELLO_INTERVAL}
                  onChange={(event) =>
                    updateAodvPeers({
                      helloInterval: Math.max(
                        AODV_MIN_HELLO_INTERVAL,
                        Math.min(
                          AODV_MAX_HELLO_INTERVAL,
                          parseNumberValue(
                            event.target.value,
                            aodvConfiguration?.helloInterval ?? AODV_MIN_HELLO_INTERVAL,
                          ),
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
                {"Route Timeout"}
              </span>
              <div className="properties__input-with-prefix">
                <Clock3 size={12} />
                <input
                  className={`properties__input ${isAodvRouteTimeoutMissing ? "properties__required-outline" : ""}`}
                  type="number"
                  min={AODV_MIN_ROUTE_TIMEOUT}
                  max={AODV_MAX_ROUTE_TIMEOUT}
                  value={aodvConfiguration?.routeTimeout ?? AODV_MIN_ROUTE_TIMEOUT}
                  onChange={(event) =>
                    updateAodvPeer({
                      routeTimeout: Math.max(
                        AODV_MIN_ROUTE_TIMEOUT,
                        Math.min(
                          AODV_MAX_ROUTE_TIMEOUT,
                          parseNumberValue(
                            event.target.value,
                            aodvConfiguration?.routeTimeout ?? AODV_MIN_ROUTE_TIMEOUT,
                          ),
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
