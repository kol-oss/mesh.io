import { Radio } from "lucide-react";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { MessageStep } from "@/shared/types/model/steps";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";

type MessageStepPropertiesProps = {
  selectedStep: MessageStep;
  peers: PeerEntity[];
  messageSourceValue: string;
  messageDestinationValue: string;
  isStepMessageSourceMissing: boolean;
  isStepMessageDestinationMissing: boolean;
  updateStep: (changes: Partial<MessageStep>) => void;
};

export default function MessageStepProperties({
  selectedStep,
  peers,
  messageSourceValue,
  messageDestinationValue,
  isStepMessageSourceMissing,
  isStepMessageDestinationMissing,
  updateStep,
}: MessageStepPropertiesProps) {
  const peerSelectOptions = peers.map((peer) => ({
    value: peer.id,
    label: peer.name,
    icon: <Radio size={12} />,
  }));

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Source"
          value={messageSourceValue}
          valid={!isStepMessageSourceMissing}
          options={peerSelectOptions}
          onChange={(value) => {
            const nextSource = value || null;
            const nextDestination =
              nextSource && selectedStep.destinationPeerId === nextSource
                ? null
                : selectedStep.destinationPeerId;

            updateStep({
              sourcePeerId: nextSource,
              destinationPeerId: nextDestination,
            });
          }}
        />
        <SelectPropertyField
          label="Destination"
          value={messageDestinationValue}
          valid={!isStepMessageDestinationMissing}
          options={peerSelectOptions.filter((peer) => peer.value !== messageSourceValue)}
          onChange={(value) => {
            const nextDestination = value || null;
            if (nextDestination && nextDestination === messageSourceValue) {
              return;
            }
            updateStep({ destinationPeerId: nextDestination });
          }}
        />
      </PropertyGroup>
    </>
  );
}
