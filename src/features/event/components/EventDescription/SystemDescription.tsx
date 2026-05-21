import PeerDescription from "@/shared/components/Description/PeerDescription";
import TextDescription from "@/shared/components/Description/TextDescription";
import type { UUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import type { PeerEntity } from "@/shared/types/model/peers";
import {
  EventType,
  type Event,
  type MoveEventDetails,
  type StatusChangeEventDetails,
  type TransferEventDetails,
} from "@/shared/types/processor/events";
import { findById } from "@/shared/utils/peers";

type SystemDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  onPeerHover: (peerId: UUID) => void;
};

export default function SystemDescription({ peers, event, onPeerHover }: SystemDescriptionProps) {
  const { type, details } = event;

  // Peer movement
  if (type === EventType.Move) {
    const { peerId, toX, toY } = details as MoveEventDetails;
    return (
      <>
        <TextDescription>
          Peer <PeerDescription peer={findById(peerId, peers)} onHover={onPeerHover} /> is moved to
          the position ({toX}, {toY}).
        </TextDescription>
      </>
    );
  }

  // Status Change
  if (type === EventType.StatusChange) {
    const { entityType, nextEnabled } = details as StatusChangeEventDetails;
    return (
      <>
        <TextDescription>
          {entityType === EntityType.Peer ? "Peer" : "Link"} has changed its status into{" "}
          <i>{nextEnabled ? "enabled" : "disabled"}</i>.
        </TextDescription>
      </>
    );
  }

  // Message transfer
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

  // Message drop
  if (type === EventType.Drop) {
    return (
      <>
        <TextDescription>
          Payload immitation message is dropped due to no available route to the destination or the
          source peer is unavailable.
        </TextDescription>
      </>
    );
  }

  return <></>;
}
