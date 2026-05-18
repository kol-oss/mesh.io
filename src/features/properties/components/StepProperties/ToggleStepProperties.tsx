import { Activity, type LucideIcon } from "lucide-react";
import {
  EntityType,
  type LinkEntity,
  type NetworkEntity,
  type PeerEntity,
} from "@/shared/types/model/entities";
import type { ToggleStep } from "@/shared/types/model/steps";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import { ENTITY_TYPE_ICONS } from "@/shared/utils/icons";
import type { SelectOption } from "@/shared/types/common/select";
import type { UUID } from "@/shared/types/common/uuid";

const mapToSelectOptions = (options: Array<PeerEntity | LinkEntity>): SelectOption<UUID>[] => {
  return options.map((entity) => {
    const Icon: LucideIcon = ENTITY_TYPE_ICONS[entity.type];
    return {
      label: entity.name,
      icon: <Icon size={12} />,
      value: entity.id,
    };
  });
};

type ToggleStepPropertiesProps = {
  step: ToggleStep;
  entities: NetworkEntity[];
  updateStep: (changes: Partial<ToggleStep>) => void;
};

export default function ToggleStepProperties({
  step,
  entities,
  updateStep,
}: ToggleStepPropertiesProps) {
  const targets = entities.filter(
    (entity): entity is PeerEntity | LinkEntity =>
      entity.type === EntityType.Peer || entity.type === EntityType.Link,
  );
  const selected = targets.find((entity) => entity.id === step.targetEntityId);

  const entityOptions: SelectOption<UUID>[] = mapToSelectOptions(targets);

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Entity"
          value={step.targetEntityId}
          valid={!!step.targetEntityId}
          options={entityOptions}
          onChange={(value) => updateStep({ targetEntityId: value })}
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
