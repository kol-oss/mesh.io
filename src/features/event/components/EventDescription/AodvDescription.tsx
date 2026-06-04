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
  const { details } = event;

  if (detailsType === EventDetailsType.AodvHelloMessageBroadcast) {
    return (
      <TextDescription>
        The node broadcast an AODV HELLO message to confirm one-hop connectivity and refresh local
        neighbour routes before they expire.
      </TextDescription>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteRequestBroadcast) {
    return (
      <TextDescription>
        The node started AODV route discovery by flooding a Route Request so downstream peers can
        install reverse routes back to the originator.
      </TextDescription>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteRequestRetransmission) {
    return (
      <TextDescription>
        The node retransmitted an AODV Route Request after updating its reverse route state for the
        discovery originator.
      </TextDescription>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteReplyForwarded) {
    return (
      <>
        <TextDescription>
          The node unicasted an AODV Route Reply along the reverse path so upstream peers could
          install or refresh forward routes to the destination.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteErrorProcessed) {
    return (
      <>
        <TextDescription>
          The node sent an AODV Route Error (unicast) to notify its precursor that the next hop is
          no longer reachable, so the precursor can invalidate affected routes.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.AodvRouteErrorBroadcast) {
    return (
      <>
        <TextDescription>
          The node broadcast an AODV Route Error to multiple precursors to notify them that the next
          hop is no longer reachable and the listed destinations are unreachable.
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
          The node evaluated AODV freshness, hop metric, and precursor state before mutating its
          routing table.
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
          The node selected the current AODV next hop for packet forwarding from its active route
          table.
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
