import { EntityType, type PeerEntity } from "@/shared/types/model/entities";
import type { MessageStep } from "@/shared/types/model/steps";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import { ENTITY_TYPE_ICONS } from "@/shared/utils/icons";
import type { UUID } from "@/shared/types/common/uuid";
import type { SelectOption } from "@/shared/types/common/select";

type MessageStepPropertiesProps = {
  step: MessageStep;
  peers: PeerEntity[];
  updateStep: (changes: Partial<MessageStep>) => void;
};

export default function MessageStepProperties({
  step,
  peers,
  updateStep,
}: MessageStepPropertiesProps) {
  const Icon = ENTITY_TYPE_ICONS[EntityType.Peer];
  const peerOptions: SelectOption<UUID>[] = peers.map((peer) => ({
    label: peer.name,
    icon: <Icon size={12} />,
    value: peer.id,
  }));

  const { sourcePeerId, destinationPeerId } = step;
  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Source"
          value={sourcePeerId}
          valid={!!sourcePeerId}
          options={peerOptions}
          onChange={(value) => {
            updateStep({
              sourcePeerId: value,
              destinationPeerId: destinationPeerId === value ? null : destinationPeerId,
            });
          }}
        />
        <SelectPropertyField
          label="Destination"
          value={destinationPeerId}
          valid={!!destinationPeerId}
          options={peerOptions.filter((peer) => peer.value !== sourcePeerId)}
          onChange={(value) => {
            if (value === sourcePeerId) {
              return;
            }

            updateStep({ destinationPeerId: value });
          }}
        />
      </PropertyGroup>
    </>
  );
}
