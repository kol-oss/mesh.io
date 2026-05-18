import { EntityType, type PeerEntity } from "@/shared/types/model/entities";
import type { MoveStep } from "@/shared/types/model/steps";
import { parseNumberValue } from "@/shared/utils/properties";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import Letter from "@/shared/components/Letter/Letter";
import { ENTITY_TYPE_ICONS } from "@/shared/utils/icons";
import type { SelectOption } from "@/shared/types/common/select";
import type { UUID } from "@/shared/types/common/uuid";

type MoveStepPropertiesProps = {
  step: MoveStep;
  peers: PeerEntity[];
  updateStep: (changes: Partial<MoveStep>) => void;
};

export default function MoveStepProperties({ step, peers, updateStep }: MoveStepPropertiesProps) {
  const Icon = ENTITY_TYPE_ICONS[EntityType.Peer];
  const peerOptions: SelectOption<UUID>[] = peers.map((peer) => ({
    label: peer.name,
    icon: <Icon size={12} />,
    value: peer.id,
  }));

  const { movePeerId } = step;
  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Peer"
          value={movePeerId || ""}
          valid={!!movePeerId}
          options={peerOptions}
          onChange={(value) => {
            const peer = peers.find((peer) => peer.id === value);
            const hasMoveCoordinates = step.x !== 0 || step.y !== 0;

            if (!peer || hasMoveCoordinates) {
              updateStep({ movePeerId: value });
              return;
            }

            updateStep({
              movePeerId: value,
              x: peer.x,
              y: peer.y,
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
