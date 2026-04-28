import { Radio } from "lucide-react";

import type { PeerEntity } from "../../../types/entities";
import type { MessageStep } from "../../../types/steps";
import Select from "../../Select/Select";

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
    <div className="properties__field">
      <div className="properties__inline-group">
        <div className="properties__field">
          <span
            className={`properties__field-label ${isStepMessageSourceMissing ? "properties__field-label--required" : ""}`}
          >
            Source
          </span>
          <Select
            value={messageSourceValue}
            invalid={isStepMessageSourceMissing}
            options={peerSelectOptions}
            onChange={(value) => {
              const nextSource = value || "";
              const nextDestination =
                nextSource && selectedStep.destinationPeerId === nextSource
                  ? ""
                  : selectedStep.destinationPeerId;

              updateStep({
                sourcePeerId: nextSource,
                destinationPeerId: nextDestination,
              });
            }}
          />
        </div>

        <div className="properties__field">
          <span
            className={`properties__field-label ${isStepMessageDestinationMissing ? "properties__field-label--required" : ""}`}
          >
            Destination
          </span>
          <Select
            value={messageDestinationValue}
            invalid={isStepMessageDestinationMissing}
            options={peerSelectOptions.filter((peer) => peer.value !== messageSourceValue)}
            onChange={(value) => {
              const nextDestination = value || "";
              if (nextDestination && nextDestination === messageSourceValue) {
                return;
              }
              updateStep({ destinationPeerId: nextDestination });
            }}
          />
        </div>
      </div>
    </div>
  );
}
