import { Clock3, ExternalLink, Radio, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import LockMessage from "@/shared/components/Property/LockMessage";
import PropertyGroup from "@/shared/components/Property/PropertyGroup";
import TextPropertyField from "@/shared/components/Property/TextPropertyField";
import NumberPropertyField from "@/shared/components/Property/NumberPropertyField";
import type { PropertiesResizeHandler } from "@/shared/types/view/properties";
import type { RefreshStep } from "@/shared/types/model/steps";
import type { PeerEntity } from "@/shared/types/model/entities";

type RefreshStepPropertiesProps = {
  widthPercent: number;
  onResizeStart: PropertiesResizeHandler;
  selectedStep: RefreshStep;
  peers: PeerEntity[];
};

export default function RefreshStepProperties({
  widthPercent,
  onResizeStart,
  selectedStep,
  peers,
}: RefreshStepPropertiesProps) {
  const refreshPeer = peers.find((peer) => peer.id === selectedStep.refreshPeerId) ?? null;

  return (
    <aside className="properties properties--locked" style={{ width: `${widthPercent}%` }}>
      <div className="properties__resizer" onPointerDown={onResizeStart} />
      <header className="properties__header">
        <p className="properties__title">{"Routing Step"}</p>
        <p className="properties__subtitle">
          {
            "Auto-generated intervaled routing refresh step for peer protocol state synchronization."
          }
        </p>
        <Link className="properties__read-more" to="/docs" target="_blank" rel="noreferrer">
          <ExternalLink size={12} />
          {"Read more"}
        </Link>
      </header>

      <LockMessage />

      <section className="properties__section">
        <p className="properties__section-title">{"Configuration"}</p>

        <label className="properties__field">
          <span className="properties__field-label">{"Name"}</span>
          <input className="properties__input" type="text" value={selectedStep.title} disabled />
        </label>

        <PropertyGroup>
          <TextPropertyField
            label="Peer"
            icon={<Radio size={12} />}
            value={refreshPeer?.name ?? "Unknown"}
            disabled
          />
          <TextPropertyField label="Protocol" value={selectedStep.refreshProtocol} disabled />
        </PropertyGroup>

        <PropertyGroup>
          <NumberPropertyField
            label="Start tick"
            icon={<Clock3 size={12} />}
            value={selectedStep.refreshStartTick}
            disabled
          />
          <NumberPropertyField
            label="Interval"
            icon={<RotateCw size={12} />}
            value={selectedStep.refreshInterval}
            disabled
          />
        </PropertyGroup>
      </section>
    </aside>
  );
}
