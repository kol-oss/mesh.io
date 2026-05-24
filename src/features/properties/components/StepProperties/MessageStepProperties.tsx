import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import SelectPropertyField from "@/features/properties/components/Property/SelectPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/common/icons";
import type { SelectOption } from "@/shared/types/common/select";
import type { UUID } from "@/shared/types/common/uuid";
import { type PeerEntity } from "@/shared/types/model/entities";
import type { MessageStep } from "@/shared/types/model/steps";

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
  const peerOptions: SelectOption<UUID>[] = peers.map((peer) => ({
    label: peer.name,
    icon: getEntityTypeIcon(peer.type),
    value: peer.id,
  }));

  const { sourceId: sourcePeerId, destinationId: destinationPeerId } = step;
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
              sourceId: value,
              destinationId: destinationPeerId === value ? null : destinationPeerId,
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

            updateStep({ destinationId: value });
          }}
        />
      </PropertyGroup>
    </>
  );
}
