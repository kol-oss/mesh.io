import { CircleDot, Diamond, ExternalLink, Lock } from "lucide-react";
import { Link } from "react-router-dom";

import { EntityType } from "@/shared/types/model/entities";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import { getConfiguration } from "@/shared/types/model/peers";
import type { PeerPropertiesPanelProps } from "@/shared/types/view/properties";
import { parseNumber } from "@/shared/utils/properties";
import Letter from "@/shared/components/Letter/Letter";
import DsdvProperties from "./DsdvProperties";
import OlsrProperties from "./OlsrProperties";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import ProtocolField from "@/shared/components/Property/ProtocolField";
import BatmanProperties from "./BatmanProperties";
import AodvProperties from "./AodvProperties";

export default function PeerProperties({
  title,
  description,
  widthPercent,
  selected: peer,
  entities,
  setEntities,
  onResizeStart,
}: PeerPropertiesPanelProps) {
  const { locked: isLocked, protocol } = peer;
  const updatePeer = (changes: Partial<PeerEntity>) => {
    if (isLocked) return;
    const updatedEntities = entities.map((entity) => {
      if (entity.id !== peer.id || entity.type !== EntityType.Peer) {
        return entity;
      }

      return {
        ...entity,
        ...changes,
      };
    });

    setEntities(updatedEntities);
  };

  const updateConfiguration = (changes: Partial<PeerConfiguration>) => {
    if (isLocked) return;

    const updatedEntities = entities.map((entity) => {
      if (entity.id !== peer.id || entity.type !== EntityType.Peer) {
        return entity;
      }

      const configuration = getConfiguration(peer);
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

  const updateConfigurationByProtocol = (
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

      {/* Peer-specific properties */}
      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={peer.name}
            valid={!peer.name}
            onChange={(event) => updatePeer({ name: event.target.value })}
          />
        </PropertyGroup>

        <PropertyGroup label="Position">
          <NumberPropertyField
            icon={<Letter value="X" />}
            value={peer.x}
            onChange={(event) => updatePeer({ x: parseNumber(event.target.value, peer.x) })}
          />
          <NumberPropertyField
            icon={<Letter value="Y" />}
            value={peer.y}
            onChange={(event) => updatePeer({ y: parseNumber(event.target.value, peer.y) })}
          />
        </PropertyGroup>

        <PropertyGroup>
          <NumberPropertyField
            label="Range"
            icon={<CircleDot size={12} />}
            value={peer.range}
            onChange={(event) =>
              updatePeer({
                range: parseNumber(event.target.value, peer.range),
              })
            }
          />
          <BooleanPropertyField
            label="Status"
            icon={<Diamond size={12} />}
            value={peer.enabled}
            content={{ true: "Enabled", false: "Disabled" }}
            onChange={() => updatePeer({ enabled: !peer.enabled })}
          />
        </PropertyGroup>
      </section>

      {/* Routing-specific properties */}
      <section className="properties__section">
        <p className="properties__section-title">{"Routing"}</p>

        <PropertyGroup>
          <ProtocolField peer={peer} onClick={(protocol) => updatePeer({ protocol })} />
        </PropertyGroup>

        {protocol === RoutingProtocol.BATMAN && (
          <BatmanProperties
            peer={peer}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}

        {protocol === RoutingProtocol.DSDV && (
          <DsdvProperties
            peer={peer}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}

        {protocol === RoutingProtocol.OLSR && (
          <OlsrProperties
            peer={peer}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}

        {protocol === RoutingProtocol.AODV && (
          <AodvProperties
            peer={peer}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}
      </section>
    </aside>
  );
}
