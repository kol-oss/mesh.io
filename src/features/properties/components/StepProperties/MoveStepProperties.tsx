import { EntityType, type PeerEntity } from "@/shared/types/model/entities";
import type { MoveStep } from "@/shared/types/model/steps";
import { parseNumberValue } from "@/shared/utils/properties";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import Letter from "@/shared/components/Letter/Letter";
import { ENTITY_TYPE_ICONS } from "@/shared/utils/icons";

type MoveStepPropertiesProps = {
  step: MoveStep;
  peers: PeerEntity[];
  updateStep: (changes: Partial<MoveStep>) => void;
};

export default function MoveStepProperties({ step, peers, updateStep }: MoveStepPropertiesProps) {
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
          label="Peer"
          value={step.movePeerId || ""}
          valid={!!step.movePeerId}
          options={peerOptions}
          onChange={(value) => {
            const nextMovePeerId = value || null;
            const selectedPeer = peers.find((peer) => peer.id === nextMovePeerId);
            const hasMoveCoordinates = step.x !== 0 || step.y !== 0;

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
          value={step.x}
          onChange={(event) => updateStep({ x: parseNumberValue(event.target.value, step.x) })}
        />
        <NumberPropertyField
          icon={<Letter value="Y" />}
          value={step.y}
          onChange={(event) => updateStep({ y: parseNumberValue(event.target.value, step.y) })}
        />
      </PropertyGroup>
    </>
  );
}
