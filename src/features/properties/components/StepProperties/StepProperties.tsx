import { Activity, ChevronsRight, Clock3, Mail } from "lucide-react";
import { EntityType } from "@/shared/types/model/entities";
import { StepType } from "@/shared/types/model/steps";
import type { NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
import type {
  ManualWorkflowStep,
  MessageStep,
  MoveStep,
  ToggleStep,
  WorkflowStep,
} from "@/shared/types/model/steps";
import type { PropertiesResizeHandler } from "@/shared/types/view/properties";
import { isRefreshStep } from "@/shared/utils/navigation/refreshSteps";
import { parseNumberValue } from "@/shared/utils/properties";
import MessageStepProperties from "./MessageStepProperties";
import MoveStepProperties from "./MoveStepProperties";
import ToggleStepProperties from "./ToggleStepProperties";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import type { SelectOption } from "@/shared/types/common/select";
import PropertyHeader from "@/shared/components/Property/PropertyHeader";
import RefreshStepProperties from "./RefreshStepProperties";

type StepPropertiesPanelProps = {
  step: WorkflowStep;
  entities: NetworkEntity[];
  steps: WorkflowStep[];
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  setSteps: (value: WorkflowStep[]) => void;
};

export default function StepProperties({
  step,
  entities,
  steps,
  widthPercent,
  onResizeStart,
  setSteps,
}: StepPropertiesPanelProps) {
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);

  const typeOptions: SelectOption<StepType>[] = [
    { label: "Message", icon: <Mail size={12} />, value: StepType.Message },
    { label: "Move", icon: <ChevronsRight size={12} />, value: StepType.Move },
    { label: "Toggle", icon: <Activity size={12} />, value: StepType.Toggle },
  ];

  const updateSelectedManualStep = (changes: Partial<ManualWorkflowStep>) => {
    const updatedSteps = steps.map((s) => {
      if (s.id !== step.id) {
        return s;
      }

      if (s.type === StepType.Message) {
        return {
          ...s,
          ...(changes as Partial<MessageStep>),
        } satisfies MessageStep;
      }

      if (s.type === StepType.Move) {
        return {
          ...s,
          ...(changes as Partial<MoveStep>),
        } satisfies MoveStep;
      }

      if (s.type === StepType.Toggle) {
        return {
          ...s,
          ...(changes as Partial<ToggleStep>),
        } satisfies ToggleStep;
      }

      return s;
    });

    setSteps(updatedSteps);
  };

  const convertStepType = (step: WorkflowStep, nextType: ManualWorkflowStep["type"]) => {
    if (step.type === nextType || isRefreshStep(step)) {
      return step;
    }

    const base = {
      id: step.id,
      title: step.title,
      tick: step.tick,
    };

    if (nextType === StepType.Message) {
      return {
        ...base,
        type: StepType.Message,
        sourcePeerId: null,
        destinationPeerId: null,
      } satisfies MessageStep;
    }

    if (nextType === StepType.Toggle) {
      return {
        ...base,
        type: StepType.Toggle,
        targetEntityId: null,
      } satisfies ToggleStep;
    }

    return {
      ...base,
      type: StepType.Move,
      movePeerId: null,
      x: 0,
      y: 0,
    } satisfies MoveStep;
  };

  const updateStepTick = (nextTick: number) => {
    const normalizedTick = Math.max(2, nextTick);
    const stepIndex = steps.findIndex((s) => s.id === step.id);
    if (stepIndex === -1) {
      return;
    }

    const updatedStep = {
      ...steps[stepIndex],
      tick: normalizedTick,
    };

    const stepsWithoutCurrent = steps.filter((s) => s.id !== step.id);
    const lastSameTickIndex = (() => {
      let lastIndex = -1;
      for (let i = 0; i < stepsWithoutCurrent.length; i++) {
        if (stepsWithoutCurrent[i].tick === normalizedTick) {
          lastIndex = i;
        }
      }
      return lastIndex;
    })();

    const insertIndex =
      lastSameTickIndex >= 0
        ? lastSameTickIndex + 1
        : (() => {
            const firstGreaterIndex = stepsWithoutCurrent.findIndex(
              (step) => step.tick > normalizedTick,
            );
            return firstGreaterIndex === -1 ? stepsWithoutCurrent.length : firstGreaterIndex;
          })();

    const reorderedSteps = [...stepsWithoutCurrent];
    reorderedSteps.splice(insertIndex, 0, updatedStep);
    setSteps(reorderedSteps);
  };

  const { type: stepType } = step;
  const isRefresh = stepType === StepType.Refresh;

  return (
    <aside className="properties" style={{ width: `${widthPercent}%` }}>
      <div className="properties__resizer" onPointerDown={onResizeStart} />

      {isRefresh ? (
        <PropertyHeader title="Refresh Step" link="/docs">
          {
            "Auto-generated intervaled routing refresh step for peer protocol state synchronization."
          }
        </PropertyHeader>
      ) : (
        <PropertyHeader title="Step" link="/docs">
          {"A discrete action in the simulation workflow, executed at a specific tick."}
        </PropertyHeader>
      )}

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={step.title}
            valid={!!step.title}
            onChange={(event) => updateSelectedManualStep({ title: event.target.value })}
            disabled={isRefresh}
          />
        </PropertyGroup>

        {stepType !== StepType.Refresh && (
          <PropertyGroup>
            <SelectPropertyField
              label="Type"
              value={step.type}
              options={typeOptions}
              onChange={(value) => {
                const nextType = value as ManualWorkflowStep["type"];
                const updatedSteps = steps.map((step) =>
                  step.id === step.id ? convertStepType(step, nextType) : step,
                );
                setSteps(updatedSteps);
              }}
            />
            <NumberPropertyField
              label="Tick"
              icon={<Clock3 size={12} />}
              value={step.tick}
              min={2}
              onChange={(event) => updateStepTick(parseNumberValue(event.target.value, step.tick))}
            />
          </PropertyGroup>
        )}

        {stepType === StepType.Refresh && <RefreshStepProperties step={step} peers={peers} />}

        {stepType === StepType.Message && (
          <MessageStepProperties step={step} peers={peers} updateStep={updateSelectedManualStep} />
        )}

        {stepType === StepType.Toggle && (
          <ToggleStepProperties
            step={step}
            entities={entities}
            updateStep={updateSelectedManualStep}
          />
        )}

        {stepType === StepType.Move && (
          <MoveStepProperties step={step} peers={peers} updateStep={updateSelectedManualStep} />
        )}
      </section>
    </aside>
  );
}
