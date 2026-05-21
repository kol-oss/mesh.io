import PeerDescription from "@/shared/components/Description/PeerDescription";
import TextDescription from "@/shared/components/Description/TextDescription";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/peers";
import { EventType, type Event, type TransferEventDetails } from "@/shared/types/processor/events";
import { findById } from "@/shared/utils/peers";

type SystemDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  onPeerHover: (peerId: UUID) => void;
};

export default function SystemDescription({ peers, event, onPeerHover }: SystemDescriptionProps) {
  const { type, details } = event;

  if (type === EventType.Transfer) {
    const { sourcePeerId, targetPeerId } = details as TransferEventDetails;
    return (
      <>
        <TextDescription>
          Payload immitation message is successfully transferred from peer{" "}
          <PeerDescription peer={findById(sourcePeerId, peers)} onHover={onPeerHover} /> to peer{" "}
          <PeerDescription peer={findById(targetPeerId, peers)} onHover={onPeerHover} /> by selected
          route.
        </TextDescription>
      </>
    );
  }

  return <></>;
}
