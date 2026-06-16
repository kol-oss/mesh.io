import BooleanPropertyField from "@/features/properties/components/Property/BooleanPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import SelectPropertyField from "@/features/properties/components/Property/SelectPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/common/icons";
import type { SelectOption } from "@/shared/types/common/select";
import type { UUID } from "@/shared/types/common/uuid";
import {
  EntityType,
  type LinkEntity,
  type NetworkEntity,
  type PeerEntity,
} from "@/shared/types/model/entities";
import type { ToggleStep } from "@/shared/types/model/steps";
import { Activity } from "lucide-react";

type ToggleStepPropertiesProps = {
  step: ToggleStep;
  entities: NetworkEntity[];
  updateStep: (changes: Partial<ToggleStep>) => void;
  disabled?: boolean;
};

export default function ToggleStepProperties({
  step,
  entities,
  updateStep,
  disabled = false,
}: ToggleStepPropertiesProps) {
  const targets = entities.filter(
    (entity): entity is PeerEntity | LinkEntity =>
      entity.type === EntityType.Peer || entity.type === EntityType.Link,
  );
  const entityOptions: SelectOption<UUID>[] = targets.map((target) => {
    return {
      label: target.name,
      icon: getEntityTypeIcon(target.type),
      value: target.id,
    };
  });

  return (
    <>
      <PropertyGroup>
        <SelectPropertyField
          label="Entity"
          value={step.entityId}
          valid={!!step.entityId}
          options={entityOptions}
          disabled={disabled}
          onChange={(value) => updateStep({ entityId: value })}
        />
        <BooleanPropertyField
          label="New Status"
          icon={<Activity size={12} />}
          value={step.status}
          content={{ true: "Enabled", false: "Disabled" }}
          disabled
        />
      </PropertyGroup>
    </>
  );
}
