import Letter from "@/shared/components/Letter/Letter";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/icons";
import type { SelectOption } from "@/shared/types/common/select";
import type { UUID } from "@/shared/types/common/uuid";
import { type PeerEntity } from "@/shared/types/model/entities";
import type { MoveStep } from "@/shared/types/model/steps";
import { parseNumberValue } from "@/shared/utils/properties";

type MoveStepPropertiesProps = {
  step: MoveStep;
  peers: PeerEntity[];
  updateStep: (changes: Partial<MoveStep>) => void;
};

export default function MoveStepProperties({ step, peers, updateStep }: MoveStepPropertiesProps) {
  const peerOptions: SelectOption<UUID>[] = peers.map((peer) => ({
    label: peer.name,
    icon: getEntityTypeIcon(peer.type),
    value: peer.id,
  }));

  const { entityId: movePeerId } = step;
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
              updateStep({ entityId: value });
              return;
            }

            updateStep({
              entityId: value,
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
