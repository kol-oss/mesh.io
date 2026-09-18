import PeerDescription from "@/features/event/components/Description/PeerDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import {
  type DsdvCalculationEventDetails,
  type DsdvDropRouteEventDetails,
  type DsdvRouteChangeEventDetails,
  type DsdvRouteRecord,
} from "@/features/processor/types/protocols/dsdv";
import {
  EventDetailsType,
  type Event,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import type { UUID } from "@/shared/types/common/uuid";
import type { DsdvConfiguration } from "@/shared/types/model/configurations";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import SecondaryDescription from "../Description/SecondaryDescription";
import VariableDescription from "../Description/VariableDescription";

type DsdvDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

export default function DsdvDescription({
  peers,
  event,
  detailsType,
  onPeerHover,
}: DsdvDescriptionProps) {
  const { details, peerId } = event;
  const peer = findById(peerId, peers)!;

  const {
    dumpInterval: fullDumpInterval,
    refreshInterval,
    routeTimeout,
  } = peer.configuration as DsdvConfiguration;

  if (detailsType === EventDetailsType.DsdvFullDumpMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every{" "}
          <VariableDescription value={fullDumpInterval}>Full Dump Interval</VariableDescription>, a
          node broadcasts a heavy weighted <i>Full Dump</i> routing update message, that contains
          node's full <i>Routing Table</i>, to neighboring nodes for complete synchronization.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvIncrementalMessageBroadcast) {
    return (
      <>
        <TextDescription>
          To indicate nearby nodes about the changes in the routing information, a node sends a
          lightweight <i>Incremental Update</i> message every time a change in the routing table
          occurs, that contains only the changed routing entries.
        </TextDescription>
        <SecondaryDescription title="Why updates are sent periodically?">
          Because of implementation reasons, in this system the message is sent every{" "}
          <VariableDescription value={refreshInterval}>
            Incremental Update Interval
          </VariableDescription>
          , but in real-life implementations it would be sent right after the change for faster
          propagation.
        </SecondaryDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvRouteAdded) {
    const { nextRoute: newRoute } = details as DsdvRouteChangeEventDetails;
    const {
      destinationPeerId: destinationId,
      nextHopPeerId: hopId,
      metric,
      sequenceNumber,
      lastUpdateTick,
    } = newRoute!;

    const isSelfRecord = destinationId === peerId && hopId === peerId;
    const text = isSelfRecord
      ? "The node added the self-route to its Routing Table for further population of the route to this node via Full Dump messages."
      : "The node evaluated a route and added it to it's Routing Table because it has the freshest sequence number or the lowest metric.";

    return (
      <>
        <TextDescription>{text}</TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "Sequence", "Last Seen"]}
          rows={[
            [
              <PeerDescription peer={findById(destinationId, peers)} onHover={onPeerHover} />,
              <PeerDescription peer={findById(hopId, peers)} onHover={onPeerHover} />,
              metric,
              sequenceNumber,
              lastUpdateTick,
            ],
          ]}
        />
      </>
    );
  }

  if (
    detailsType === EventDetailsType.DsdvRouteUpdated ||
    detailsType === EventDetailsType.DsdvRouteRemoved
  ) {
    const { nextRoute, previousRoute } = details as DsdvRouteChangeEventDetails;
    const route = nextRoute ?? previousRoute!;

    return (
      <>
        <TextDescription>
          The node evaluated a route and updated its routing table according to sequence freshness
          and metric comparison rules.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "Sequence", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(route.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription peer={findById(route.nextHopPeerId, peers)} onHover={onPeerHover} />,
              route.metric,
              route.sequenceNumber,
              route.lastUpdateTick,
            ],
          ]}
        />
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvRouteSelected) {
    const routeSelection = details as GetRouteEventDetails;
    const selectedRoute = routeSelection.selectedRoute as DsdvRouteRecord;

    return (
      <>
        <TextDescription>
          The node selected the route to the destination peer based on the existing route in the{" "}
          <i>Routing Table</i>.
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

  if (detailsType === EventDetailsType.DsdvRouteDropped) {
    const { record } = details as DsdvDropRouteEventDetails;

    return (
      <>
        <TextDescription>
          A route was dropped by the module because there are better route with fresher sequence
          number or lower hop count already present in the <i>Routing Table</i>.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "Sequence"]}
          rows={[
            [
              <PeerDescription
                peer={findById(record.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(record.nextHopPeerId, peers)}
                onHover={onPeerHover}
              />,
              record.metric + 1,
              record.sequenceNumber,
            ],
          ]}
        />
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvRefreshSkipped) {
    return (
      <>
        <TextDescription>
          There was no updates in the <i>Routing Table</i> during the interval, so there are no need
          to send an <i>Incremental Update</i> message.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.DsdvRouteExpiredCalculation) {
    const { route, sequence } = details as DsdvCalculationEventDetails;
    return (
      <>
        <TextDescription>
          The route is considered expired because there were no corresponding updates in the{" "}
          <i>Routing Table</i> for a{" "}
          <VariableDescription value={routeTimeout}>Route Timeout</VariableDescription>. The route
          is updated and will be used in next <i>Incremental Update</i> to notify other nodes about
          the route unavailability.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Metric", "Sequence", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(route.destinationPeerId, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription peer={findById(route.nextHopPeerId, peers)} onHover={onPeerHover} />,
              route.metric,
              route.sequenceNumber,
              route.lastUpdateTick,
            ],
          ]}
        />
        <SecondaryDescription title="Why the metric become 16?">
          The value of 16 is considered as <i>Infinity</i> in the DSDV protocol, indicating that the
          route is no longer reachable. When other node receives an update with metric equal to{" "}
          <i>Infinity</i>, it will remove the route from its routing table.
        </SecondaryDescription>
        <SecondaryDescription title="Why the sequence number is odd?">
          <p>
            The odd sequence number indicates that the route is unreachable, while even sequence
            numbers indicate valid routes. The odd number is calculated by incremeting the expired
            route sequence number.
          </p>
          <br />
          <p>
            The sequence number of the route was {sequence} before the update. Because the route{" "}
            <VariableDescription
              value={`Last updated at ${route.lastUpdateTick}, passed ${routeTimeout} ticks`}
            >
              was last seen
            </VariableDescription>{" "}
            before <i>Route Timeout</i>, it became unreachable, and its sequence number incremented
            to {route.sequenceNumber}.
          </p>
        </SecondaryDescription>
      </>
    );
  }
  return <></>;
}
