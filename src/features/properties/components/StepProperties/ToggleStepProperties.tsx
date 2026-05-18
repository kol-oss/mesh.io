import BooleanPropertyField from "@/shared/components/Property/BooleanPropertyField";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/icons";
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
  const selected = targets.find((entity) => entity.id === step.entityId);
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
          onChange={(value) => updateStep({ entityId: value })}
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
