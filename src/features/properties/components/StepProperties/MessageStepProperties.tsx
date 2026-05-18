import { EntityType, type PeerEntity } from "@/shared/types/model/entities";
import type { MessageStep } from "@/shared/types/model/steps";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import { ENTITY_TYPE_ICONS } from "@/shared/utils/icons";

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
  const peerOptions = peers.map((peer) => ({
    label: peer.name,
    icon: <Icon size={12} />,
    value: peer.id,
  }));

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Source"
          value={step.sourcePeerId || ""}
          valid={!!step.sourcePeerId}
          options={peerOptions}
          onChange={(value) => {
            const nextSource = value || null;
            const nextDestination =
              nextSource && step.destinationPeerId === nextSource ? null : step.destinationPeerId;

            updateStep({
              sourcePeerId: nextSource,
              destinationPeerId: nextDestination,
            });
          }}
        />
        <SelectPropertyField
          label="Destination"
          value={step.destinationPeerId || ""}
          valid={!!step.destinationPeerId}
          options={peerOptions.filter((peer) => peer.value !== step.sourcePeerId)}
          onChange={(value) => {
            const nextDestination = value || null;
            if (nextDestination && nextDestination === step.sourcePeerId) {
              return;
            }
            updateStep({ destinationPeerId: nextDestination });
          }}
        />
      </PropertyGroup>
    </>
  );
}
