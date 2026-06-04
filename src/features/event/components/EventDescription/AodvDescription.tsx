import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import {
  type AodvRouteChangeEventDetails,
  type AodvRouteRecord,
} from "@/features/processor/types/protocols/aodv";
import {
  DropReason,
  EventDetailsType,
  type DropEventDetails,
  type Event,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import type { ReactNode } from "react";
import VariableDescription from "@/features/event/components/Description/VariableDescription.tsx";
import type { AodvConfiguration } from "@/shared/types/model/configurations.ts";
import SecondaryDescription from "@/features/event/components/Description/SecondaryDescription.tsx";

type AodvDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

const getRouteRows = (details: AodvRouteChangeEventDetails) => {
  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

const renderPrecursors = (
  precursorPeerIds: UUID[],
  peers: PeerEntity[],
  onPeerHover: (peerId: UUID) => void,
): ReactNode => {
  if (precursorPeerIds.length === 0) {
    return "-";
  }

  return precursorPeerIds.map((peerId, index) => (
    <span key={`aodv-precursor-${peerId}`}>
      <PeerDescription peer={findById(peerId, peers)} onHover={onPeerHover} />
      {index < precursorPeerIds.length - 1 ? ", " : ""}
    </span>
  ));
};

const renderRouteTable = (
  routes: AodvRouteRecord[],
  peers: PeerEntity[],
  onPeerHover: (peerId: UUID) => void,
) => {
  return (
    <TableDescription
      headers={["Destination", "Next Hop", "Metric", "Sequence", "Precursors"]}
      rows={routes.map((route) => [
        <PeerDescription peer={findById(route.destinationId, peers)} onHover={onPeerHover} />,
        <PeerDescription peer={findById(route.nextHopId, peers)} onHover={onPeerHover} />,
        route.hopCount,
        route.sequence,
        renderPrecursors(route.precursors, peers, onPeerHover),
      ])}
    />
  );
};

export default function AodvDescription({
  peers,
  event,
  detailsType,
  onPeerHover,
}: AodvDescriptionProps) {
  const { details, peerId } = event;
  const peer = findById(peerId, peers)!;

  const { helloInterval } = peer.configuration as AodvConfiguration;

  if (detailsType === EventDetailsType.AodvHelloMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every <VariableDescription value={helloInterval}>HELLO Interval</VariableDescription>, an
          AODV node broadcasts a <i>HELLO</i> message to neighboring nodes to maintain local
          connectivity.
        </TextDescription>
        <TextDescription>
          When a neighbor receives this message, it creates or updates a direct routing table entry
          for the sender, updating its <i>Lifetime</i> to prevent premature route expiration.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteRequestBroadcast) {
    return (
      <>
        <TextDescription>
          The node initiated an <i>Route Discovery</i> process by broadcasting a{" "}
          <i>Route Request (RREQ)</i> message. It increments its own sequence number and caches the
          RREQ ID alongside its IP address to ensure that duplicate requests are dropped and
          broadcast storms are prevented.
        </TextDescription>
        <TextDescription>
          As this RREQ propagates, downstream nodes will utilize the <i>Originator IP Address</i>{" "}
          and the <i>Originator Sequence Number</i> to establish or update temporary reverse routes.
          These reverse paths are strictly maintained for a limited duration to enable the eventual
          return of a Route Reply.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteRequestRetransmission) {
    return (
      <>
        <TextDescription>
          The intermediate node successfully processed the incoming <i>Route Request</i>, confirming
          it was not a duplicate. It subsequently created or refreshed a reverse routing table entry
          pointing back to the originator of the discovery process.
        </TextDescription>
        <SecondaryDescription title={"Why this node is not considered final?"}>
          Because this node is neither the destination nor does it possess a fresh enough active
          route (a valid route with a sequence number greater than or equal to the requested one),
          it increments the hop count, decrements the <i>Time To Live</i>, and rebroadcasts the RREQ
          further into the network.
        </SecondaryDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteReplyForwarded) {
    return (
      <>
        <TextDescription>
          The node received a <i>Route Request (RREQ)</i> and utilized the enclosed Destination
          Sequence Number and Hop Count to establish or update a forward route to the destination.
          It also explicitly added the next hop toward the originator into its precursor list for
          this route.
        </TextDescription>
        <TextDescription>
          Since this node is an intermediate hop and not the original source of the RREQ, it
          unicasts the <i>Route Reply (RREP)</i> backward along the previously established reverse
          path. This allows upstream peers to sequentially build the forward path until the
          originator is reached.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteErrorProcessed) {
    return (
      <>
        <TextDescription>
          The node detected a link break or received a Route Error from a downstream neighbor. It
          immediately invalidated the affected routing table entries, incremented their Destination
          Sequence Numbers, and set the hop count to infinity.
        </TextDescription>
        <TextDescription>
          Because only a single neighboring node (precursor) was actively utilizing this broken path
          to forward data, the node generated and unicasted the resulting Route Error (RERR) message
          exclusively to that specific neighbor to minimize unnecessary control traffic overhead.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteErrorBroadcast) {
    return (
      <>
        <TextDescription>
          The node detected an unreachable next hop, forcing it to invalidate all dependent routing
          table entries. It incremented the Destination Sequence Numbers for these unreachable
          destinations to prevent upstream nodes from forming routing loops.
        </TextDescription>
        <TextDescription>
          Because multiple precursor nodes were actively relying on this router to reach the
          affected destinations, the node transmitted the Route Error (RERR) message via a local
          broadcast. This ensures all dependent neighbors simultaneously purge the stale routes.
        </TextDescription>
      </>
    );
  }

  if (
    detailsType === EventDetailsType.AodvRouteAdded ||
    detailsType === EventDetailsType.AodvRouteUpdated ||
    detailsType === EventDetailsType.AodvRouteRemoved
  ) {
    const routeChange = details as AodvRouteChangeEventDetails;
    if (routeChange.protocol !== RoutingProtocol.AODV) {
      return <></>;
    }

    return (
      <>
        <TextDescription>
          The node modified its <i>Routing Table</i> entry based on sequence number freshness, hop
          count metrics, or link availability. A route is only adopted if it offers a greater{" "}
          <i>Destination Sequence Number</i> or a shorter path, while broken links result in
          immediate route invalidation.
        </TextDescription>
        {renderRouteTable(getRouteRows(routeChange), peers, onPeerHover)}
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteSelected) {
    const routeSelection = details as GetRouteEventDetails;
    const selectedRoute = routeSelection.selectedRoute as AodvRouteRecord;

    return (
      <>
        <TextDescription>
          The node successfully matched the data packet's destination address against a valid,
          active entry in its <i>Routing Table</i>. It then retrieved the corresponding next hop to
          forward the traffic along the established path.
        </TextDescription>
        {renderRouteTable([selectedRoute], peers, onPeerHover)}
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteDropped) {
    const drop = details as DropEventDetails;

    if (drop.reason === DropReason.NoRoute) {
      return (
        <TextDescription>
          Packet forwarding failed because AODV could not find or discover an active route for the
          destination.
        </TextDescription>
      );
    }

    if (drop.reason === DropReason.TimeToLiveExceeded) {
      return (
        <TextDescription>
          Packet forwarding stopped because the AODV packet exhausted its TTL before reaching the
          destination.
        </TextDescription>
      );
    }

    if (drop.reason === DropReason.UnsupportedProtocol) {
      return (
        <TextDescription>
          Packet forwarding failed because the selected next hop does not run the AODV protocol.
        </TextDescription>
      );
    }

    return (
      <TextDescription>
        Packet forwarding was dropped by AODV processing because {drop.reason.toLowerCase()}.
      </TextDescription>
    );
  }

  return <></>;
}
