import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import {
  type DsrCalculationEventDetails,
  type DsrPathRecord,
  type DsrRouteChangeEventDetails,
} from "@/features/processor/types/protocols/dsr";
import {
  DropReason,
  EventDetailsType,
  type DropEventDetails,
  type Event,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import VariableDescription from "@/features/event/components/Description/VariableDescription.tsx";
import type { DsrConfiguration } from "@/shared/types/model/configurations.ts";
import SecondaryDescription from "@/features/event/components/Description/SecondaryDescription.tsx";

type DsrDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

export default function DsrDescription({
  peers,
  event,
  detailsType,
  onPeerHover,
}: DsrDescriptionProps) {
  const { details, peerId } = event;
  const peer = findById(peerId, peers)!;

  const { routeTimeout } = peer.configuration as DsrConfiguration;

  const getPathString = (path: UUID[]) =>
    path.map((peerId) => findById(peerId, peers)?.name ?? peerId).join(" -> ");

  if (
    detailsType === EventDetailsType.DsrRouteRequestBroadcast ||
    detailsType === EventDetailsType.DsrRouteRequestRetransmission
  ) {
    return (
      <>
        <TextDescription>
          Because of the Message step, the <i>Route Discovery</i> mechanism was triggered. The DSR
          node broadcasts a <i>Route Request (RREQ)</i> to explore the path to the destination node.
        </TextDescription>
        <TextDescription>
          The request mainly loans on the IPv4 fields to determine originator and destination of the
          message. The protocol payload is encapsulated into part called <i>Route Request Option</i>
          . For simplicity, this is the only part that is displayed in the Packet Inspection mode.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteReplyForwarded) {
    return (
      <>
        <TextDescription>
          Upon reaching the target node, or an intermediate node possessing a valid cached route,
          the destination generates a <i>Route Reply (RREP)</i>. In contrast to the initial
          exploration phase, this message is unicasted directly back to the initiating node.
        </TextDescription>
        <TextDescription>
          The packet transports the accumulated path sequence within the <i>Route Reply Option</i>.
          As the message traverses the network in reverse, transit nodes extract these topological
          links to dynamically update their respective routing caches.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrPathRecalculated) {
    const { isFromCache, destinationId, reversedPath } = details as DsrCalculationEventDetails;
    return (
      <>
        <TextDescription>
          The current node{" "}
          {isFromCache
            ? "already contains cached path to the destination"
            : "is the destination node"}{" "}
          <PeerDescription
            peer={findById(destinationId, peers)}
            onHover={() => onPeerHover(destinationId)}
          />
          , so there are no need for further <i>Route Request (RREQ)</i> retransmissions. Now node
          will reverse the received path from packet and return the <i>Route Reply (RREP)</i>{" "}
          through it to the originator.
        </TextDescription>
        <SecondaryDescription title={"How the reply path is formed?"}>
          The node received path from the <i>Route Request</i>, and{" "}
          {isFromCache ? "appends it with the existing path from cache" : "reverses it"} to transfer
          the <i>Route Reply</i> back, converting it into {getPathString(reversedPath)}.
        </SecondaryDescription>
      </>
    );
  }

  if (
    detailsType === EventDetailsType.DsrRouteAdded ||
    detailsType === EventDetailsType.DsrRouteUpdated
  ) {
    const { destinationId, lastUpdateTick, isSourceCaching, identification, path } =
      details as DsrRouteChangeEventDetails;
    return (
      <>
        <TextDescription>
          The node caches route inside structure called <i>Route Cache</i> to optimize communication
          speed with the same node for{" "}
          <VariableDescription value={`${routeTimeout}`}>Route Timeout</VariableDescription> ticks.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Path", "Last Seen"]}
          rows={[
            [
              <PeerDescription peer={findById(destinationId, peers)} onHover={onPeerHover} />,
              getPathString(path),
              lastUpdateTick,
            ],
          ]}
        />
        {isSourceCaching && (
          <SecondaryDescription title={"What is the Snooping mechanism?"}>
            This path was cached using the <i>Snooping</i> mechanism, meaning it was learned from a
            packet that was neither originated nor destined for this node. Only paths that have
            already been traversed by messages are cached.
          </SecondaryDescription>
        )}
        {identification !== undefined && (
          <SecondaryDescription title={"What is the Identification field?"}>
            The <i>Route Request</i> message is broadcasted, so to prevent duplications and cycles,
            each message contains{" "}
            <VariableDescription value={"Identification for this message: " + identification}>
              sequence number
            </VariableDescription>
            , that is stored in <i>Route Request Table</i> and used to determine whether this
            message was already processed.
          </SecondaryDescription>
        )}
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteRemoved) {
    const { destinationId, path } = details as DsrRouteChangeEventDetails;
    return (
      <>
        <TextDescription>
          The record in the <i>Route Cache</i> was not updated for{" "}
          <VariableDescription value={`${routeTimeout}`}>Route Timeout</VariableDescription> ticks,
          so it is removed from cache and <i>Request Table</i>.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Path"]}
          rows={[
            [
              <PeerDescription peer={findById(destinationId, peers)} onHover={onPeerHover} />,
              getPathString(path),
            ],
          ]}
        />
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteSelected) {
    const routeSelection = details as GetRouteEventDetails;
    const { path } = routeSelection.selectedRoute as DsrPathRecord;

    return (
      <>
        <TextDescription>
          The originating node retrieves path from the <i>Route Cache</i> and encapsulates it inside
          the payload block called <i>Source Route Option</i>. Each next hop reads the corresponding
          path and gets next address from the path to transfer packet to it.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Path"]}
          rows={[
            [
              <PeerDescription
                peer={findById(routeSelection.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              getPathString(path),
            ],
          ]}
        />
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteSalvage) {
    return (
      <>
        <TextDescription>
          The node detected that the cached path is not valid, so it sends <i>Route Error (RERR)</i>{" "}
          message back to the originator to initiate retry. The hops on the way also deletes records
          from <i>Route Cache</i> that contains invalid path.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteDropped) {
    const { reason } = details as DropEventDetails;

    if (reason === DropReason.NoRoute || reason === DropReason.DestinationUnavailable) {
      return (
        <TextDescription>
          Packet forwarding failed because the route cache had no valid DSR source route for the
          destination.
        </TextDescription>
      );
    }

    if (reason === DropReason.TimeToLiveExceeded) {
      return (
        <TextDescription>
          Packet forwarding stopped because the packet TTL expired before reaching its destination.
        </TextDescription>
      );
    }

    return (
      <TextDescription>
        Packet forwarding was dropped by DSR processing due to {reason.toLowerCase()}.
      </TextDescription>
    );
  }

  return <></>;
}
