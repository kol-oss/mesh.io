import { Clock3, Radio, RotateCw } from "lucide-react";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import type { RefreshStep } from "@/shared/types/model/steps";
import type { PeerEntity } from "@/shared/types/model/entities";

type RefreshStepPropertiesProps = {
  step: RefreshStep;
  peers: PeerEntity[];
};

export default function RefreshStepProperties({ step, peers }: RefreshStepPropertiesProps) {
  const peer = peers.find((peer) => peer.id === step.refreshPeerId) ?? null;

  return (
    <>
      <PropertyGroup>
        <TextPropertyField
          label="Peer"
          icon={<Radio size={12} />}
          value={peer?.name ?? "Unknown"}
          disabled
        />
        <TextPropertyField label="Protocol" value={step.refreshProtocol} disabled />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Start tick"
          icon={<Clock3 size={12} />}
          value={step.refreshStartTick}
          disabled
        />
        <NumberPropertyField
          label="Interval"
          icon={<RotateCw size={12} />}
          value={step.refreshInterval}
          disabled
        />
      </PropertyGroup>
    </>
  );
}
