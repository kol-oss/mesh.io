import { Activity, Link2, Radio } from "lucide-react";
import { EntityType } from "@/shared/types/model/entities";
import type { LinkEntity, PeerEntity } from "@/shared/types/model/entities";
import type { ToggleStep } from "@/shared/types/model/steps";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";

type ToggleStepPropertiesProps = {
  toggleTargets: Array<PeerEntity | LinkEntity>;
  toggleTargetValue: string;
  isStepToggleEntityMissing: boolean;
  reverseStatusLabel: string;
  updateStep: (changes: Partial<ToggleStep>) => void;
};

export default function ToggleStepProperties({
  toggleTargets,
  toggleTargetValue,
  isStepToggleEntityMissing,
  reverseStatusLabel,
  updateStep,
}: ToggleStepPropertiesProps) {
  const toggleTargetOptions = toggleTargets.map((entity) => ({
    value: entity.id,
    label: entity.name,
    icon: entity.type === EntityType.Peer ? <Radio size={12} /> : <Link2 size={12} />,
  }));

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Entity"
          value={toggleTargetValue}
          valid={!isStepToggleEntityMissing}
          options={toggleTargetOptions}
          onChange={(value) => updateStep({ targetEntityId: value || null })}
        />
        <BooleanPropertyField
          label="New Status"
          icon={<Activity size={12} />}
          value={reverseStatusLabel === "Enabled"}
          content={{ true: "Enabled", false: "Disabled" }}
          disabled
        />
      </PropertyGroup>
    </>
  );
}
