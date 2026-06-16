import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import PropertyHeader from "@/features/properties/components/Property/PropertyHeader";
import SelectPropertyField from "@/features/properties/components/Property/SelectPropertyField";
import TextPropertyField from "@/features/properties/components/Property/TextPropertyField";
import { getStepTypeIcon } from "@/shared/constants/common/icons";
import { MIN_TICK } from "@/shared/constants/tick";
import type { SelectOption } from "@/shared/types/common/select";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
import { EntityType } from "@/shared/types/model/entities";
import type { Step, UserStep } from "@/shared/types/model/steps";
import { StepType } from "@/shared/types/model/steps";
import { parseNumberValue } from "@/shared/utils/properties";
import { convertStep, updateStep, updateTickAndReorder } from "@/shared/utils/steps";
import { Clock3 } from "lucide-react";
import LockMessage from "../Property/LockMessage";
import MessageStepProperties from "./MessageStepProperties";
import MoveStepProperties from "./MoveStepProperties";
import RefreshStepProperties from "./RefreshStepProperties";
import ToggleStepProperties from "./ToggleStepProperties";

type StepPropertiesPanelProps = {
  step: Step;
  entities: NetworkEntity[];
  steps: Step[];
  setSteps: (value: Step[]) => void;
  isLocked?: boolean;
};

export default function StepProperties({
  step,
  entities,
  steps,
  setSteps,
  isLocked = false,
}: StepPropertiesPanelProps) {
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);

  const typeOptions: SelectOption<StepType>[] = [
    { label: "Message", icon: getStepTypeIcon(StepType.Message), value: StepType.Message },
    { label: "Move", icon: getStepTypeIcon(StepType.Move), value: StepType.Move },
    { label: "Toggle", icon: getStepTypeIcon(StepType.Toggle), value: StepType.Toggle },
  ];

  const updateManualStep = (changes: Partial<UserStep>) => {
    const updatedSteps = steps.map((s) => {
      if (s.id === step.id) {
        return updateStep(s, changes);
      }

      return s;
    });

    setSteps(updatedSteps);
  };

  const updateStepTick = (nextTick: number) => {
    const reorderedSteps = updateTickAndReorder(step, nextTick, steps);
    setSteps(reorderedSteps);
  };

  const { type: stepType } = step;
  const isRefresh = stepType === StepType.Refresh;
  const isStepLocked = isRefresh || isLocked;

  return (
    <>
      {isRefresh ? (
        <PropertyHeader title="Refresh Step" link="/docs/system#refresh-steps">
          {
            "Auto-generated intervaled routing refresh step for peer protocol state synchronization."
          }
        </PropertyHeader>
      ) : (
        <PropertyHeader title="Step" link="/docs/system#steps">
          {"A discrete action in the simulation workflow, executed at a specific tick."}
        </PropertyHeader>
      )}

      {isStepLocked && <LockMessage />}

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={step.title}
            valid={!!step.title}
            onChange={(event) => updateManualStep({ title: event.target.value })}
            disabled={isStepLocked}
          />
        </PropertyGroup>

        {!isRefresh && (
          <PropertyGroup>
            <SelectPropertyField
              label="Type"
              value={step.type}
              options={typeOptions}
              disabled={isStepLocked}
              onChange={(value: StepType) => {
                const updatedSteps = steps.map((s) =>
                  s.id === step.id ? convertStep(s, value) : s,
                );
                setSteps(updatedSteps);
              }}
            />
            <NumberPropertyField
              label="Tick"
              icon={<Clock3 size={12} />}
              value={step.tick}
              min={MIN_TICK}
              disabled={isStepLocked}
              onChange={(event) => updateStepTick(parseNumberValue(event.target.value, step.tick))}
            />
          </PropertyGroup>
        )}

        {stepType === StepType.Refresh && <RefreshStepProperties step={step} peers={peers} />}

        {stepType === StepType.Message && (
          <MessageStepProperties
            step={step}
            peers={peers}
            updateStep={updateManualStep}
            disabled={isStepLocked}
          />
        )}

        {stepType === StepType.Toggle && (
          <ToggleStepProperties
            step={step}
            entities={entities}
            updateStep={updateManualStep}
            disabled={isStepLocked}
          />
        )}

        {stepType === StepType.Move && (
          <MoveStepProperties
            step={step}
            peers={peers}
            updateStep={updateManualStep}
            disabled={isStepLocked}
          />
        )}
      </section>
    </>
  );
}
