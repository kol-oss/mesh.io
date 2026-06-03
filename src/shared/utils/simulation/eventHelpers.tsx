import type { UUID } from "@/shared/types/common/uuid";
import type { ReactNode } from "react";

export const renderPeerName = (
  peerId: UUID,
  peerName: string,
  onPeerHoverChange: (peerId: UUID | null) => void,
): ReactNode => {
  return (
    <span
      className="simulation-panel__peer-name"
      onMouseEnter={() => onPeerHoverChange(peerId)}
      onMouseLeave={() => onPeerHoverChange(null)}
    >
      {peerName}
    </span>
  );
};

export const getPeerLabel = (peerId: UUID, peerNameById: Map<UUID, string>) => {
  return peerNameById.get(peerId) ?? peerId;
};
