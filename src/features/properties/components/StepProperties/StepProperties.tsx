import { Activity, ChevronsRight, Clock3, ExternalLink, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { EntityType } from "@/shared/types/model/entities";
import { StepType } from "@/shared/types/model/steps";
import type { LinkEntity, NetworkEntity, PeerEntity } from "@/shared/types/model/entities";
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
import RefreshStepProperties from "./RefreshStepProperties";
import ToggleStepProperties from "./ToggleStepProperties";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import SelectPropertyField from "@/shared/components/Property/SelectPropertyField";
import type { SelectOption } from "@/shared/types/common/select";

type StepPropertiesPanelProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedStep: WorkflowStep;
  entities: NetworkEntity[];
  steps: WorkflowStep[];
  setSteps: (value: WorkflowStep[]) => void;
};

export default function StepProperties({
  widthPercent,
  onResizeStart,
  selectedStep,
  entities,
  steps,
  setSteps,
}: StepPropertiesPanelProps) {
  const peers = entities.filter((entity): entity is PeerEntity => entity.type === EntityType.Peer);

  if (isRefreshStep(selectedStep)) {
    return (
      <RefreshStepProperties
        widthPercent={widthPercent}
        onResizeStart={onResizeStart}
        selectedStep={selectedStep}
        peers={peers}
      />
    );
  }

  const toggleTargets = entities.filter(
    (entity): entity is PeerEntity | LinkEntity =>
      entity.type === EntityType.Peer || entity.type === EntityType.Link,
  );

  const typeOptions: SelectOption<StepType>[] = [
    { label: "Message", icon: <Mail size={12} />, value: StepType.Message },
    { label: "Move", icon: <ChevronsRight size={12} />, value: StepType.Move },
    { label: "Toggle", icon: <Activity size={12} />, value: StepType.Toggle },
  ];

  const toggleTargetValue =
    selectedStep.type === StepType.Toggle &&
    toggleTargets.some((entity) => entity.id === selectedStep.targetEntityId)
      ? (selectedStep.targetEntityId ?? "")
      : "";

  const toggleTargetEntity = toggleTargets.find((entity) => entity.id === toggleTargetValue);

  const updateSelectedManualStep = (changes: Partial<ManualWorkflowStep>) => {
    const updatedSteps = steps.map((step) => {
      if (step.id !== selectedStep.id) {
        return step;
      }

      if (step.type === StepType.Message) {
        return {
          ...step,
          ...(changes as Partial<MessageStep>),
        } satisfies MessageStep;
      }

      if (step.type === StepType.Move) {
        return {
          ...step,
          ...(changes as Partial<MoveStep>),
        } satisfies MoveStep;
      }

      if (step.type === StepType.Toggle) {
        return {
          ...step,
          ...(changes as Partial<ToggleStep>),
        } satisfies ToggleStep;
      }

      return step;
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
    const stepIndex = steps.findIndex((step) => step.id === selectedStep.id);
    if (stepIndex === -1) {
      return;
    }

    const updatedStep = {
      ...steps[stepIndex],
      tick: normalizedTick,
    };

    const stepsWithoutCurrent = steps.filter((step) => step.id !== selectedStep.id);
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

  return (
    <aside className="properties" style={{ width: `${widthPercent}%` }}>
      <div className="properties__resizer" onPointerDown={onResizeStart} />
      <header className="properties__header">
        <p className="properties__title">{"Step"}</p>
        <p className="properties__subtitle">
          {"A discrete action in the simulation workflow, executed at a specific tick."}
        </p>
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {"Read more"}
        </Link>
      </header>

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <PropertyGroup>
          <TextPropertyField
            label="Name"
            value={selectedStep.title}
            valid={!!selectedStep.title}
            onChange={(event) => updateSelectedManualStep({ title: event.target.value })}
          />
        </PropertyGroup>

        <PropertyGroup>
          <SelectPropertyField
            label="Type"
            value={selectedStep.type}
            options={typeOptions}
            onChange={(value) => {
              const nextType = value as ManualWorkflowStep["type"];
              const updatedSteps = steps.map((step) =>
                step.id === selectedStep.id ? convertStepType(step, nextType) : step,
              );
              setSteps(updatedSteps);
            }}
          />
          <NumberPropertyField
            label="Tick"
            icon={<Clock3 size={12} />}
            value={selectedStep.tick}
            min={2}
            onChange={(event) =>
              updateStepTick(parseNumberValue(event.target.value, selectedStep.tick))
            }
          />
        </PropertyGroup>

        {selectedStep.type === StepType.Message && (
          <MessageStepProperties
            step={selectedStep}
            peers={peers}
            updateStep={updateSelectedManualStep}
          />
        )}

        {selectedStep.type === StepType.Toggle && (
          <ToggleStepProperties
            targets={toggleTargets}
            selected={toggleTargetEntity}
            updateStep={updateSelectedManualStep}
          />
        )}

        {selectedStep.type === StepType.Move && (
          <MoveStepProperties
            step={selectedStep}
            peers={peers}
            updateStep={updateSelectedManualStep}
          />
        )}
      </section>
    </aside>
  );
}
