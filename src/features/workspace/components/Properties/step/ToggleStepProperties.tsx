import { Activity, Link2, Radio } from "lucide-react";
import { EntityType } from "../../../../../shared/types/model/entities";
import type { LinkEntity, PeerEntity } from "../../../../../shared/types/model/entities";
import type { ToggleStep } from "../../../../../shared/types/model/steps";
import Select from "../../../../../shared/components/Select/Select";

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
    <div className="properties__field">
      <div className="properties__inline-group">
        <div className="properties__field">
          <span
            className={`properties__field-label ${isStepToggleEntityMissing ? "properties__field-label--required" : ""}`}
          >
            {"Entity"}
          </span>
          <Select
            value={toggleTargetValue}
            invalid={isStepToggleEntityMissing}
            options={toggleTargetOptions}
            onChange={(value) => updateStep({ targetEntityId: value || null })}
          />
        </div>

        <label className="properties__field">
          <span
            className={`properties__field-label ${isStepToggleEntityMissing ? "properties__field-label--required" : ""}`}
          >
            {"New status"}
          </span>
          <button
            className={`properties__status ${isStepToggleEntityMissing ? "properties__required-outline" : ""}`}
            type="button"
            disabled
          >
            <Activity size={12} />
            {reverseStatusLabel}
          </button>
        </label>
      </div>
    </div>
  );
}
