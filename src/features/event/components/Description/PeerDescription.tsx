import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/peers";

type PeerDescriptionProps = {
  peer: PeerEntity | null;
  onHover: (peerId: UUID) => void;
};

export default function PeerDescription({ peer, onHover }: PeerDescriptionProps) {
  if (!peer) return null;

  const { id, name } = peer;
  return (
    <span className="simulation-panel__peer-name" onMouseEnter={() => onHover(id)}>
      {name}
    </span>
  );
}
