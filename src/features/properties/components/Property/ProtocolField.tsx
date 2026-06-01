import { ROUTING_PROTOCOLS, type RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerEntity } from "@/shared/types/model/peers";
import PropertyLabel from "./PropertyLabel";

type ProtocolFieldProps = {
  peer: PeerEntity;
  onClick: (protocol: RoutingProtocol) => void;
  disabled?: boolean;
};

export default function ProtocolField({ peer, onClick, disabled = false }: ProtocolFieldProps) {
  return (
    <>
      <PropertyLabel label="Protocol" />
      <div className={`properties__protocols`}>
        {ROUTING_PROTOCOLS.map((protocol) => {
          const isActive = peer.protocol === protocol;
          return (
            <button
              className={`properties__protocol ${isActive ? "properties__protocol--active" : ""}`}
              key={protocol}
              type="button"
              disabled={disabled}
              onClick={() => onClick(protocol)}
            >
              {protocol}
            </button>
          );
        })}
      </div>
    </>
  );
}
