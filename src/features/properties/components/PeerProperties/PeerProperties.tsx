import { CircleDot, Clock3, Diamond, ExternalLink, Globe, Lock } from "lucide-react";
import { Link } from "react-router-dom";

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
  DsdvConfiguration,
  OlsrConfiguration,
  PeerConfiguration,
} from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import {
  getAodvConfiguration,
  getConfiguration,
  getDsdvConfiguration,
  getOlsrConfiguration,
} from "@/shared/types/model/peers";
import type { PeerPropertiesPanelProps } from "@/shared/types/view/properties";
import { parseNumberValue, parsePositiveNumberValue } from "@/shared/utils/properties";
import Letter from "@/shared/components/Letter/Letter";
import BatmanProperties from "../BatmanProperties/BatmanProperties";
import type { UUID } from "@/shared/types/common/uuid";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import ProtocolField from "@/shared/components/Property/ProtocolField";

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
  const dsdvConfiguration = getDsdvConfiguration(selectedPeer);
  const aodvConfiguration = getAodvConfiguration(selectedPeer);
  const olsrConfiguration = getOlsrConfiguration(selectedPeer);
  const isPeerNameMissing = selectedPeer.name.trim() === "";
  const isProtocolMissing = false;
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

  const updatePeerById = (id: UUID, changes: Partial<PeerConfiguration>) => {
    if (isLocked) return;

    const updatedEntities = entities.map((entity) => {
      if (entity.id !== id || entity.type !== EntityType.Peer) {
        return entity;
      }

      const configuration = getConfiguration(entity);
      if (!configuration) {
        return entity;
      }

      return {
        ...entity,
        configuration: {
          ...configuration,
          ...changes,
        } as PeerConfiguration,
      };
    });

    setEntities(updatedEntities);
  };

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

  const updatePeersByProtocol = (
    protocol: RoutingProtocol,
    changes: Partial<PeerConfiguration>,
  ) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.type !== EntityType.Peer || entity.protocol !== protocol) {
        return entity;
      }

      const configuration = getConfiguration(entity);
      if (!configuration) {
        return entity;
      }

      return {
        ...entity,
        configuration: {
          ...configuration,
          ...changes,
        } as PeerConfiguration,
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

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={selectedPeer.name}
            valid={!isPeerNameMissing}
            onChange={(event) => updatePeer({ name: event.target.value })}
          />
        </PropertyGroup>

        <PropertyGroup label="Position">
          <NumberPropertyField
            icon={<Letter value="X" />}
            value={selectedPeer.x}
            onChange={(event) =>
              updatePeer({ x: parseNumberValue(event.target.value, selectedPeer.x) })
            }
          />
          <NumberPropertyField
            icon={<Letter value="Y" />}
            value={selectedPeer.y}
            onChange={(event) =>
              updatePeer({ y: parseNumberValue(event.target.value, selectedPeer.y) })
            }
          />
        </PropertyGroup>

        <PropertyGroup>
          <NumberPropertyField
            label="Range"
            icon={<CircleDot size={12} />}
            value={selectedPeer.range}
            onChange={(event) =>
              updatePeer({
                range: parsePositiveNumberValue(event.target.value, selectedPeer.range),
              })
            }
          />
          <BooleanPropertyField
            label="Status"
            icon={<Diamond size={12} />}
            value={selectedPeer.enabled}
            content={{ true: "Enabled", false: "Disabled" }}
            onChange={() => updatePeer({ enabled: !selectedPeer.enabled })}
          />
        </PropertyGroup>
      </section>

      <section className="properties__section">
        <p className="properties__section-title">{"Routing"}</p>

        <PropertyGroup>
          <ProtocolField
            peer={selectedPeer}
            valid={!isProtocolMissing}
            onClick={(protocol) => updatePeer({ protocol })}
          />
        </PropertyGroup>

        {selectedProtocol === RoutingProtocol.BATMAN && (
          <BatmanProperties
            peer={selectedPeer}
            updatePeerById={updatePeerById}
            updatePeersByProtocol={updatePeersByProtocol}
          />
        )}

        {selectedProtocol === RoutingProtocol.DSDV && (
          <>
            <label className="properties__field">
              {renderGlobalLabel("Incremental Update Interval", isDsdvIncrementalMissing)}
              <div className="properties__input-with-icon">
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
              <div className="properties__input-with-icon">
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
              <div className="properties__input-with-icon">
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
              <div className="properties__input-with-icon">
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
              <div className="properties__input-with-icon">
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
              <div className="properties__input-with-icon">
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
              <div className="properties__input-with-icon">
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
