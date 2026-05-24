import NumberPropertyField from "@/features/properties/components/Property/NumberPropertyField";
import PropertyGroup from "@/features/properties/components/Property/PropertyGroup";
import TextPropertyField from "@/features/properties/components/Property/TextPropertyField";
import { getEntityTypeIcon } from "@/shared/constants/icons";
import { EntityType, type PeerEntity } from "@/shared/types/model/entities";
import type { RefreshStep } from "@/shared/types/model/steps";
import { Clock3, RotateCw } from "lucide-react";

type RefreshStepPropertiesProps = {
  step: RefreshStep;
  peers: PeerEntity[];
};

export default function RefreshStepProperties({ step, peers }: RefreshStepPropertiesProps) {
  const peer = peers.find((peer) => peer.id === step.peerId) ?? null;

  return (
    <>
      <PropertyGroup>
        <TextPropertyField
          label="Peer"
          icon={getEntityTypeIcon(EntityType.Peer)}
          value={peer?.name ?? "Unknown"}
          disabled
        />
        <TextPropertyField label="Protocol" value={step.protocol} disabled />
      </PropertyGroup>

      <PropertyGroup>
        <NumberPropertyField
          label="Start tick"
          icon={<Clock3 size={12} />}
          value={step.startTick}
          disabled
        />
        <NumberPropertyField
          label="Interval"
          icon={<RotateCw size={12} />}
          value={step.interval}
          disabled
        />
      </PropertyGroup>
    </>
  );
}
