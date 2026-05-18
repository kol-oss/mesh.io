import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import LockMessage from "@/shared/components/Property/LockMessage";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import PropertyHeader from "@/shared/components/Property/PropertyHeader";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/icons";
import type { UUID } from "@/shared/types/common/uuid";
import type { LinkEntity, PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type { EntityPropertiesPanelProps } from "@/shared/types/view/properties";
import { updateEntity } from "@/shared/utils/mutation";
import { Diamond } from "lucide-react";

type LinkPropertiesPanelProps = EntityPropertiesPanelProps<LinkEntity>;

export default function LinkProperties({
  selected,
  entities,
  widthPercent,
  onResizeStart,
  setEntities,
}: LinkPropertiesPanelProps) {
  const {
    name,
    locked: isLocked,
    sourcePeerId: sourceValue,
    destinationPeerId: destinationValue,
  } = selected;
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);

  const peerOptions = peers.map((peer) => ({
    value: peer.id,
    label: peer.name,
    icon: getEntityTypeIcon(peer.type),
  }));

  const updateLink = (changes: Partial<LinkEntity>) => {
    setEntities(updateEntity(selected, entities, changes));
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

      <PropertyHeader title="Link" link="/docs">
        {"A persistent bidirectional connection between two nodes in the network."}
      </PropertyHeader>

      {isLocked && <LockMessage />}

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={name}
            valid={!!name}
            onChange={(event) => updateLink({ name: event.target.value })}
            disabled={isLocked}
          />
        </PropertyGroup>

        <PropertyGroup>
          <SelectPropertyField
            label="Source"
            value={sourceValue}
            valid={!!sourceValue}
            options={peerOptions}
            onChange={(value) => {
              const nextSource = (value as UUID) || null;
              const nextDestination =
                nextSource && selected.destinationPeerId === nextSource
                  ? null
                  : selected.destinationPeerId;

              updateLink({
                sourcePeerId: nextSource,
                destinationPeerId: nextDestination,
              });
            }}
          />

          <SelectPropertyField
            label="Destination"
            value={destinationValue}
            valid={!!destinationValue}
            options={peerOptions.filter((peer) => peer.value !== sourceValue)}
            onChange={(value) => {
              const nextDestination = (value as UUID) || null;
              if (nextDestination && nextDestination === sourceValue) {
                return;
              }
              updateLink({ destinationPeerId: nextDestination });
            }}
          />
        </PropertyGroup>

        <PropertyGroup>
          <BooleanPropertyField
            label="Status"
            icon={<Diamond size={12} />}
            value={selected.enabled}
            content={{ true: "Enabled", false: "Disabled" }}
            onChange={() => updateLink({ enabled: !selected.enabled })}
          />
        </PropertyGroup>
      </section>
    </aside>
  );
}
