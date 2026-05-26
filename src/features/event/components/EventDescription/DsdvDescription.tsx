import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import { type DsdvRouteChangeEventDetails } from "@/features/processor/types/protocols/dsdv";
import {
  EventDetailsType,
  EventType,
  type DropEventDetails,
  type Event,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import { RoutingProtocol } from "@/shared/types/common/protocols";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";

type DsdvDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

const getRouteRows = (details: DsdvRouteChangeEventDetails) => {
  if (details.nextRoute) {
    return [details.nextRoute];
  }

  return details.previousRoute ? [details.previousRoute] : [];
};

export default function DsdvDescription({
  peers,
  event,
  detailsType,
  onPeerHover,
}: DsdvDescriptionProps) {
  const { details, type } = event;

  if (detailsType === EventDetailsType.DsdvFullDumpMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every <u>Full Dump Interval</u>, a DSDV node broadcasts a heavy weighted <i>Full Dump</i>{" "}
          routing update message to neighboring nodes to synchronize their routing tables.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvFullDumpMessageRetransmission) {
    return (
      <>
        <TextDescription>
          Node retransmits a <i>Full Dump</i> of routing table to distribute the updated route state
          to neighbouring peers.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvIncrementalMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every <u>Incremental Update Interval</u>, a DSDV node broadcasts a lightweight{" "}
          <i>Incremental</i> routing update message to neighboring nodes to notify them about the
          latest changes inside routing tables.
        </TextDescription>
        <TextDescription>
          Unlike the <i>Full Dump</i> messages, the <i>Incremental Update</i> contains only the
          changed routing entries and is purposed for rapid updates, rather than complete
          synchronization.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvIncrementalMessageRetransmission) {
    return (
      <>
        <TextDescription>
          Node retransmits a <i>Incremental</i> routing update message to distribute the updated
          route state to neighbouring peers.
        </TextDescription>
      </>
    );
  }

  if (
    type === EventType.AddRoute ||
    type === EventType.UpdateRoute ||
    type === EventType.DeleteRoute
  ) {
    const routeChange = details as DsdvRouteChangeEventDetails;
    if (routeChange.protocol !== RoutingProtocol.DSDV) {
      return <></>;
    }

    return (
      <>
        <TextDescription>
          The node evaluated a route and updated its routing table according to sequence freshness
          and metric comparison rules.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "Sequence", "Last Seen"]}
          rows={getRouteRows(routeChange).map((route) => [
            <PeerDescription
              peer={findById(route.destinationPeerId, peers)}
              onHover={onPeerHover}
            />,
            <PeerDescription peer={findById(route.nextHopPeerId, peers)} onHover={onPeerHover} />,
            route.metric,
            route.sequenceNumber,
            route.lastUpdateTick,
          ])}
        />
      </>
    );
  }

  if (type === EventType.GetRoute) {
    const routeSelection = details as GetRouteEventDetails;
    if (
      routeSelection.protocol !== RoutingProtocol.DSDV ||
      !("nextHopPeerId" in routeSelection.selectedRoute)
    ) {
      return <></>;
    }

    const selectedRoute = routeSelection.selectedRoute;
    return (
      <>
        <TextDescription>
          Node selected a DSDV next hop for packet forwarding using the current best route entry.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "Sequence", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(routeSelection.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(selectedRoute.nextHopPeerId, peers)}
                onHover={onPeerHover}
              />,
              selectedRoute.metric,
              selectedRoute.sequenceNumber,
              selectedRoute.lastUpdateTick,
            ],
          ]}
        />
      </>
    );
  }

  if (type === EventType.Drop) {
    const drop = details as DropEventDetails;
    return (
      <TextDescription>
        DSDV packet or control handling was dropped at this node. Reason:{" "}
        <i>{String(drop.reason)}</i>.
      </TextDescription>
    );
  }

  return <></>;
}
