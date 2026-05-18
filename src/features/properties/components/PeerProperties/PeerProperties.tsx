import { CircleDot, Diamond } from "lucide-react";

import Letter from "@/shared/components/Letter/Letter";
import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import LockMessage from "@/shared/components/Property/LockMessage";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import PropertyHeader from "@/shared/components/Property/PropertyHeader";
import ProtocolField from "@/shared/components/Property/ProtocolField";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import { getConfiguration } from "@/shared/types/model/peers";
import type { EntityPropertiesProps } from "@/shared/types/view/properties";
import { updateEntity } from "@/shared/utils/mutation";
import { parseNumber } from "@/shared/utils/properties";
import AodvProperties from "./AodvProperties";
import BatmanProperties from "./BatmanProperties";
import DsdvProperties from "./DsdvProperties";
import OlsrProperties from "./OlsrProperties";

type PeerPropertiesProps = EntityPropertiesProps<PeerEntity>;

export default function PeerProperties({ selected, entities, setEntities }: PeerPropertiesProps) {
  const { locked: isLocked, protocol } = selected;
  const updatePeer = (changes: Partial<PeerEntity>) => {
    setEntities(updateEntity(selected, entities, changes));
  };

  const updateConfiguration = (changes: Partial<PeerConfiguration>) => {
    if (isLocked) return;

    const updatedEntities = entities.map((entity) => {
      if (entity.id !== selected.id || entity.type !== EntityType.Peer) {
        return entity;
      }

      const configuration = getConfiguration(selected);
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
    <>
      <PropertyHeader title="Peer" link="/docs">
        {"A mesh network node with built-in support for specific routing protocols."}
      </PropertyHeader>

      {isLocked && <LockMessage />}

      {/* Peer-specific properties */}
      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={selected.name}
            valid={!!selected.name}
            disabled={isLocked}
            onChange={(event) => updatePeer({ name: event.target.value })}
          />
        </PropertyGroup>

        <PropertyGroup label="Position">
          <NumberPropertyField
            icon={<Letter value="X" />}
            value={selected.x}
            disabled={isLocked}
            onChange={(event) => updatePeer({ x: parseNumber(event.target.value, selected.x) })}
          />
          <NumberPropertyField
            icon={<Letter value="Y" />}
            value={selected.y}
            disabled={isLocked}
            onChange={(event) => updatePeer({ y: parseNumber(event.target.value, selected.y) })}
          />
        </PropertyGroup>

        <PropertyGroup>
          <NumberPropertyField
            label="Range"
            icon={<CircleDot size={12} />}
            value={selected.range}
            disabled={isLocked}
            onChange={(event) =>
              updatePeer({
                range: parseNumber(event.target.value, selected.range),
              })
            }
          />
          <BooleanPropertyField
            label="Status"
            icon={<Diamond size={12} />}
            value={selected.enabled}
            content={{ true: "Enabled", false: "Disabled" }}
            disabled={isLocked}
            onChange={() => updatePeer({ enabled: !selected.enabled })}
          />
        </PropertyGroup>
      </section>

      {/* Routing-specific properties */}
      <section className="properties__section">
        <p className="properties__section-title">{"Routing"}</p>

        <PropertyGroup>
          <ProtocolField peer={selected} onClick={(protocol) => updatePeer({ protocol })} />
        </PropertyGroup>

        {protocol === RoutingProtocol.BATMAN && (
          <BatmanProperties
            peer={selected}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}

        {protocol === RoutingProtocol.DSDV && (
          <DsdvProperties
            peer={selected}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}

        {protocol === RoutingProtocol.OLSR && (
          <OlsrProperties
            peer={selected}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}

        {protocol === RoutingProtocol.AODV && (
          <AodvProperties
            peer={selected}
            updateConfiguration={updateConfiguration}
            updateConfigurationByProtocol={updateConfigurationByProtocol}
          />
        )}
      </section>
    </>
  );
}
