import { Radio } from "lucide-react";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { MoveStep } from "@/shared/types/model/steps";
import { parseNumberValue } from "@/shared/utils/properties";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import Letter from "@/shared/components/Letter/Letter";

type MoveStepPropertiesProps = {
  selectedStep: MoveStep;
  peers: PeerEntity[];
  moveTargetValue: string;
  isStepMoveEntityMissing: boolean;
  updateStep: (changes: Partial<MoveStep>) => void;
};

export default function MoveStepProperties({
  selectedStep,
  peers,
  moveTargetValue,
  isStepMoveEntityMissing,
  updateStep,
}: MoveStepPropertiesProps) {
  const peerOptions = peers.map((peer) => ({
    value: peer.id,
    label: peer.name,
    icon: <Radio size={12} />,
  }));

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Peer"
          value={moveTargetValue}
          valid={!isStepMoveEntityMissing}
          options={peerOptions}
          onChange={(value) => {
            const nextMovePeerId = value || null;
            const selectedPeer = peers.find((peer) => peer.id === nextMovePeerId);
            const hasMoveCoordinates = selectedStep.x !== 0 || selectedStep.y !== 0;

            if (!selectedPeer || hasMoveCoordinates) {
              updateStep({ movePeerId: nextMovePeerId });
              return;
            }

            updateStep({
              movePeerId: nextMovePeerId,
              x: selectedPeer.x,
              y: selectedPeer.y,
            });
          }}
        />
      </PropertyGroup>

      <PropertyGroup label="Position">
        <NumberPropertyField
          icon={<Letter value="X" />}
          value={selectedStep.x}
          onChange={(event) =>
            updateStep({ x: parseNumberValue(event.target.value, selectedStep.x) })
          }
        />
        <NumberPropertyField
          icon={<Letter value="Y" />}
          value={selectedStep.y}
          onChange={(event) =>
            updateStep({ y: parseNumberValue(event.target.value, selectedStep.y) })
          }
        />
      </PropertyGroup>
    </>
  );
}
