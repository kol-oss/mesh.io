import BooleanPropertyField from "@/features/properties/components/Property/BooleanPropertyField";
import LockMessage from "@/features/properties/components/Property/LockMessage";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import PropertyHeader from "@/features/properties/components/Property/PropertyHeader";
import SelectPropertyField from "@/features/properties/components/Property/SelectPropertyField";
import TextPropertyField from "@/features/properties/components/Property/TextPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/common/icons";
import { createLinkPropertiesSchema } from "@/shared/schemas/entity/LinkEntitySchema";
import type { UUID } from "@/shared/types/common/uuid";
import type { LinkEntity, PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type { EntityPropertiesProps } from "@/shared/types/view/properties";
import { updateEntity } from "@/shared/utils/mutation";
import { Diamond } from "lucide-react";

type LinkPropertiesProps = EntityPropertiesProps<LinkEntity>;

export default function LinkProperties({
  selected,
  entities,
  setEntities,
  isLocked: isSimulationLocked = false,
}: LinkPropertiesProps) {
  const {
    name,
    locked: isEntityLocked,
    sourcePeerId: sourceValue,
    destinationPeerId: destinationValue,
  } = selected;
  const isLocked = isEntityLocked || isSimulationLocked;
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);
  const peerOptions = peers.map((peer) => ({
    value: peer.id,
    label: peer.name,
    icon: getEntityTypeIcon(peer.type),
  }));

  const peerIds = new Set(peers.map((peer) => peer.id));
  const linkValidation = createLinkPropertiesSchema(peerIds).safeParse({
    name,
    sourcePeerId: sourceValue,
    destinationPeerId: destinationValue,
  });
  const linkErrors = linkValidation.success ? null : linkValidation.error.flatten().fieldErrors;

  const updateLink = (changes: Partial<LinkEntity>) => {
    setEntities(updateEntity(selected, entities, changes));
  };

  return (
    <>
      <PropertyHeader title="Link" link="/docs/system#links">
        {"A persistent bidirectional connection between two nodes in the network."}
      </PropertyHeader>

      {isLocked && <LockMessage />}

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={name}
            valid={!linkErrors?.name}
            onChange={(event) => updateLink({ name: event.target.value })}
            disabled={isLocked}
          />
        </PropertyGroup>

        <PropertyGroup>
          <SelectPropertyField
            label="Source"
            value={sourceValue}
            valid={!linkErrors?.sourcePeerId}
            options={peerOptions}
            disabled={isLocked}
            onChange={(value: UUID | null) => {
              const nextDestination =
                selected.destinationPeerId === value ? null : selected.destinationPeerId;

              updateLink({
                sourcePeerId: value,
                destinationPeerId: nextDestination,
              });
            }}
          />

          <SelectPropertyField
            label="Destination"
            value={destinationValue}
            valid={!linkErrors?.destinationPeerId}
            options={peerOptions.filter((peer) => peer.value !== sourceValue)}
            disabled={isLocked}
            onChange={(value: UUID | null) => {
              if (value && value === sourceValue) {
                return;
              }
              updateLink({ destinationPeerId: value });
            }}
          />
        </PropertyGroup>

        <PropertyGroup>
          <BooleanPropertyField
            label="Status"
            icon={<Diamond size={12} />}
            value={selected.enabled}
            content={{ true: "Enabled", false: "Disabled" }}
            disabled={isLocked}
            onChange={() => updateLink({ enabled: !selected.enabled })}
          />
        </PropertyGroup>
      </section>
    </>
  );
}
