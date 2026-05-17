import { ROUTING_PROTOCOLS, type RoutingProtocol } from "@/shared/types/common/protocols";
import type { PeerEntity } from "@/shared/types/model/peers";
import PropertyLabel from "./PropertyLabel";

type ProtocolFieldProps = {
  peer: PeerEntity;
  valid?: boolean;
  onClick: (protocol: RoutingProtocol) => void;
};

export default function ProtocolField({ peer, valid, onClick }: ProtocolFieldProps) {
  return (
    <>
      <PropertyLabel label="Protocol" valid={valid} />
      <div className={`properties__protocols ${!valid ? "properties__required-outline" : ""}`}>
        {ROUTING_PROTOCOLS.map((protocol) => {
          const isActive = peer.protocol === protocol;
          return (
            <button
              className={`properties__protocol ${isActive ? "properties__protocol--active" : ""}`}
              key={protocol}
              type="button"
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
