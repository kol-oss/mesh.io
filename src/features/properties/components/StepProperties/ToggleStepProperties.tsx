import { Activity, type LucideIcon } from "lucide-react";
import type { LinkEntity, PeerEntity } from "@/shared/types/model/entities";
import type { ToggleStep } from "@/shared/types/model/steps";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import { ENTITY_TYPE_ICONS } from "@/shared/utils/icons";
import type { SelectOption } from "@/shared/types/common/select";

const mapToSelectOptions = (options: Array<PeerEntity | LinkEntity>): SelectOption[] => {
  return options.map((entity) => {
    const Icon: LucideIcon = ENTITY_TYPE_ICONS[entity.type];
    return {
      value: entity.id,
      label: entity.name,
      icon: <Icon size={12} />,
    };
  });
};

type ToggleStepPropertiesProps = {
  selected?: PeerEntity | LinkEntity;
  targets: Array<PeerEntity | LinkEntity>;
  updateStep: (changes: Partial<ToggleStep>) => void;
};

export default function ToggleStepProperties({
  selected,
  targets,
  updateStep,
}: ToggleStepPropertiesProps) {
  const entityOptions = mapToSelectOptions(targets);

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Entity"
          value={selected?.id || ""}
          valid={!!selected}
          options={entityOptions}
          onChange={(value) => updateStep({ targetEntityId: value || null })}
        />
        <BooleanPropertyField
          label="New Status"
          icon={<Activity size={12} />}
          value={!selected?.enabled || false}
          content={{ true: "Enabled", false: "Disabled" }}
          disabled
        />
      </PropertyGroup>
    </>
  );
}
