import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import {
  type DsrRouteChangeEventDetails,
  type DsrRouteRecord,
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
  const { details } = event;

  if (detailsType === EventDetailsType.DsrRouteRequestBroadcast) {
    return (
      <>
        <TextDescription>
          Because of the Message step, the <i>Route Discovery</i> mechanism was triggered. The DSR
          node broadcasts a <i>Route Request</i> to explore the path to the destination node.
        </TextDescription>
        <TextDescription>
          The request mainly loans on the IPv4 fields to determine originator and destination of the
          message. The protocol payload is encapsulated into part called <i>Route Request Option</i>
          . For simplicity, this is the only part that is displayed in the Packet Inspection mode.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteRequestRetransmission) {
    return (
      <TextDescription>
        Node retransmitted a DSR Route Request while appending itself to the discovered route
        record.
      </TextDescription>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteReplyForwarded) {
    return (
      <>
        <TextDescription>
          Node forwarded a DSR Route Reply (RREP) carrying the discovered source route back toward
          the initiator.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteSalvage) {
    return (
      <>
        <TextDescription>
          Node attempted packet salvaging by switching to an alternate cached source route after a
          link break.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrPathRecalculated) {
    return (
      <>
        <TextDescription>
          Node processed DSR control-plane logic while maintaining source routes and route-cache
          consistency.
        </TextDescription>
      </>
    );
  }

  if (
    detailsType === EventDetailsType.DsrRouteAdded ||
    detailsType === EventDetailsType.DsrRouteUpdated ||
    detailsType === EventDetailsType.DsrRouteRemoved
  ) {
    const { destinationPeerId, nextRoute: route } = details as DsrRouteChangeEventDetails;
    if (!route) {
      return <></>;
    }

    const { pathPeerIds: path } = route;
    const fullPath = [event.peerId, ...path, destinationPeerId];
    return (
      <>
        <TextDescription>
          The node updated its DSR Route Cache after discovery or maintenance processing.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Path", "Identification", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(route.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              fullPath.map((peerId) => findById(peerId, peers)?.name ?? peerId).join(" -> "),
              route.sequenceNumber,
              route.lastUpdateTick,
            ],
          ]}
        />
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteSelected) {
    const routeSelection = details as GetRouteEventDetails;
    const selectedRoute = routeSelection.selectedRoute as DsrRouteRecord;

    const { pathPeerIds: path } = selectedRoute;
    const fullPath = [event.peerId, ...path, routeSelection.destinationPeerId];

    return (
      <>
        <TextDescription>
          Node selected a DSR source route from the Route Cache and used its next hop for packet
          forwarding.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Path", "Identification", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(routeSelection.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(selectedRoute?.nextHopPeerId, peers)}
                onHover={onPeerHover}
              />,
              selectedRoute?.metric,
              selectedRoute?.sequenceNumber,
              fullPath.map((peerId) => findById(peerId, peers)?.name ?? peerId).join(" -> "),
              selectedRoute?.lastUpdateTick,
            ],
          ]}
        />
      </>
    );
  }

  if (detailsType === EventDetailsType.DsrRouteDropped) {
    const drop = details as DropEventDetails;

    if (drop.reason === DropReason.NoRoute || drop.reason === DropReason.DestinationUnavailable) {
      return (
        <TextDescription>
          Packet forwarding failed because the route cache had no valid DSR source route for the
          destination.
        </TextDescription>
      );
    }

    if (drop.reason === DropReason.TimeToLiveExceeded) {
      return (
        <TextDescription>
          Packet forwarding stopped because the packet TTL expired before reaching its destination.
        </TextDescription>
      );
    }

    return (
      <TextDescription>
        Packet forwarding was dropped by DSR processing due to {drop.reason.toLowerCase()}.
      </TextDescription>
    );
  }

  return <></>;
}
