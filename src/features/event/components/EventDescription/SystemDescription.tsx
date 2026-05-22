import PeerDescription from "@/shared/components/Description/PeerDescription";
import TextDescription from "@/shared/components/Description/TextDescription";
import {
  DropReason,
  EventType,
  type DropEventDetails,
  type Event,
  type MoveEventDetails,
  type StatusChangeEventDetails,
  type TransferEventDetails,
} from "@/shared/types/common/events";
import type { UUID } from "@/shared/types/common/uuid";
import { EntityType } from "@/shared/types/model/entities";
import type { PeerEntity } from "@/shared/types/model/peers";
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
          Message is successfully transferred from peer{" "}
          <PeerDescription peer={findById(sourcePeerId, peers)} onHover={onPeerHover} /> to peer{" "}
          <PeerDescription peer={findById(targetPeerId, peers)} onHover={onPeerHover} /> by selected
          route.
        </TextDescription>
      </>
    );
  }

  // Message drop
  if (type === EventType.Drop) {
    const { reason } = details as DropEventDetails;
    if (reason === DropReason.NoRoute || reason === DropReason.DestinationUnavailable) {
      return (
        <TextDescription>
          Message is dropped due to no available route to the destination or the source peer is
          unavailable.
        </TextDescription>
      );
    } else if (reason === DropReason.TimeToLiveExceeded) {
      return <TextDescription>Message is dropped due to time-to-live exceeded.</TextDescription>;
    } else if (reason === DropReason.Duplicate) {
      return <TextDescription>Message is dropped due to duplication.</TextDescription>;
    } else if (reason === DropReason.SourceIsTarget) {
      return (
        <TextDescription>
          Message is dropped because the source and target are the same or the broadcast is
          initiated by the destination node.
        </TextDescription>
      );
    } else if (reason === DropReason.NotOptimalRoute) {
      return (
        <TextDescription>Message is dropped because the route is not optimal.</TextDescription>
      );
    }
  }

  return <></>;
}
