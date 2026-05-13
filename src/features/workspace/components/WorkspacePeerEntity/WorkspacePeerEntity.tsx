import { Radio } from "lucide-react";
import type { PeerEntity } from "../../../../shared/types/entities";

type Props = {
  peer: PeerEntity;
  isSelected: boolean;
  isDragging: boolean;
  isMoving: boolean;
  isStatusTransitioning: boolean;
  onPeerHoverChange: (peerId: string | null) => void;
  onPointerDown: (peer: PeerEntity, event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerEnd: (event: React.PointerEvent<HTMLElement>) => void;
};

export default function WorkspacePeerEntity({
  peer,
  isSelected,
  isDragging,
  isMoving,
  isStatusTransitioning,
  onPeerHoverChange,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
}: Props) {
  return (
    <button
      className={`workspace__peer${isSelected ? " workspace__peer--selected" : ""}${isDragging ? " workspace__peer--dragging" : ""}${peer.enabled ? "" : " workspace__peer--disabled"}${isMoving ? " workspace__peer--moving" : ""}${isStatusTransitioning ? " workspace__peer--status-transition" : ""}`}
      style={{
        left: `calc(50% + ${peer.x}px)`,
        top: `calc(50% + ${peer.y}px)`,
      }}
      type="button"
      onPointerEnter={() => onPeerHoverChange(peer.id)}
      onPointerLeave={() => onPeerHoverChange(null)}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(peer, event);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      aria-label={`Peer ${peer.name}`}
    >
      <span className="workspace__peer-icon">
        <Radio size={20} />
      </span>
      <span className="workspace__peer-name">{peer.name}</span>
    </button>
  );
}
