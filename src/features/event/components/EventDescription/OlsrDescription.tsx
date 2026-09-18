import PeerDescription from "@/features/event/components/Description/PeerDescription";
import SecondaryDescription from "@/features/event/components/Description/SecondaryDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import VariableDescription from "@/features/event/components/Description/VariableDescription";
import {
  type OlsrBaseChangeEventDetails,
  type OlsrCalculationEventDetails,
  OlsrChangeEventDetailsType,
  type OlsrNeighbourChangeEventDetails,
  OlsrNeighbourStatus,
  type OlsrRouteChangeEventDetails,
  type OlsrRouteRecord,
} from "@/features/processor/types/protocols/olsr";
import {
  type DropEventDetails,
  DropReason,
  type Event,
  EventDetailsType,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import type { UUID } from "@/shared/types/common/uuid";
import type { OlsrConfiguration } from "@/shared/types/model/configurations.ts";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import type { ReactNode } from "react";

type OlsrDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

export default function OlsrDescription({
  peers,
  event,
  detailsType,
  onPeerHover,
}: OlsrDescriptionProps) {
  const { details, peerId } = event;
  const peer = peers.find((peer) => peer.id === peerId);

  if (!peer) {
    return <></>;
  }

  const { helloInterval, tcInterval } = peer.configuration as OlsrConfiguration;

  // HELLO message broadcast
  if (detailsType === EventDetailsType.OlsrHelloMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every <VariableDescription value={helloInterval}>HELLO Interval</VariableDescription>, an
          OLSR node locally broadcasts a <i>HELLO</i> message to immediate neighboring nodes for
          link sensing and to verify bidirectional communication.
        </TextDescription>
        <TextDescription>
          The node also includes lists of its known neighbors' addresses in the message, and updates
          the <i>Link Message Size</i> field to share topology information.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.OlsrTcMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every <VariableDescription value={tcInterval}>TC Interval</VariableDescription>, an OLSR
          node selected as a Multipoint Relay (MPR) broadcasts a <i>Topology Control (TC)</i>{" "}
          message to the entire network to declare its MPR Selector Set.
        </TextDescription>
        <TextDescription>
          The node includes the addresses of the neighbors that selected it as an MPR, and updates
          the <i>ANSN (Advertised Neighbor Sequence Number)</i> to ensure other nodes maintain fresh
          global topology information.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.OlsrTcMessageRetransmission) {
    return (
      <>
        <>
          <TextDescription>
            Upon receiving a <i>Transaction Control (TC)</i> message, an OLSR node retransmits it
            only if the sender's address is listed in its <i>MPR Selector Set</i> and the message
            has not been previously processed.
          </TextDescription>
        </>
      </>
    );
  }

  if (detailsType === EventDetailsType.OlsrRouteCalculation) {
    const { nodesByNeighbours } = details as OlsrCalculationEventDetails;
    const rows: ReactNode[][] = [];

    for (const [neighbourId, nodes] of nodesByNeighbours.entries()) {
      const reachable = [...nodes].map((nodeId) => findById(nodeId, peers)!.name).join(", ");

      rows.push([
        <PeerDescription peer={findById(neighbourId, peers)} onHover={onPeerHover} />,
        reachable,
      ]);
    }

    return (
      <>
        <TextDescription>
          The <i>Multipoint Relay (MPR)</i> calculation is a process where an OLSR node selects a
          minimal subset of its symmetric 1-hop neighbors to relay its messages, optimizing classic
          flooding by drastically reducing packet redundancy and wireless collisions.
        </TextDescription>
        <TextDescription>
          This process is triggered whenever the node detects a change in its symmetric neighborhood
          or 2-hop topology, typically after processing an incoming <i>HELLO</i> message, ensuring
          that all 2-hop neighbors can still be reached with the minimum number of relays.
        </TextDescription>
        <SecondaryDescription title={"How was MPR Set calculated?"}>
          <p>
            The calculation begins by analyzing the local two-hop graph, where the node immediately
            adds essential 1-hop neighbors to its MPR set if they provide the only available path to
            any specific 2-hop node.
          </p>
          <br />
          <p>
            For the remaining uncovered destinations, the node runs a greedy, BFS-like selection
            process, iteratively choosing the 1-hop neighbor that yields the maximum coverage over
            the remaining 2-hop nodes until all are reachable.
          </p>
          <TableDescription headers={["Neighbour", "Reachable Addresses"]} rows={[...rows]} />
        </SecondaryDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.OlsrRouteAdded) {
    const { type: changeType } = details as OlsrBaseChangeEventDetails;
    if (changeType === OlsrChangeEventDetailsType.NEIGHBOUR) {
      const { neighbour, twoHopNeighbours } = details as OlsrNeighbourChangeEventDetails;
      return (
        <>
          <TextDescription>
            The node received <i>HELLO</i> message from the neighbour and updated it's{" "}
            <i>Neighbour Set</i> and <i>Two-Hop Neighbour Set</i> by information received from the
            message.
          </TextDescription>
          <TableDescription
            headers={["Address", "Status", "Last Seen"]}
            rows={[
              [
                <PeerDescription
                  peer={findById(neighbour.neighbourPeerId, peers)}
                  onHover={onPeerHover}
                />,
                neighbour.status === OlsrNeighbourStatus.Symmetric ? "SYM" : "MPR",
                neighbour.lastUpdateTick,
              ],
            ]}
          />
          <SecondaryDescription title={"How Two-Hop Neighbours Set changed?"}>
            The node reads the set of neighbours from the <i>HELLO</i> message and records them into
            two-hop neighbours by the node where the message came from.
            {twoHopNeighbours.length > 0 ? (
              <>
                <TableDescription
                  headers={["Address", "Two-Hop Address", "Last Update"]}
                  rows={twoHopNeighbours.map((neighbour) => [
                    <PeerDescription
                      peer={findById(neighbour.viaPeerId, peers)}
                      onHover={onPeerHover}
                    />,
                    <PeerDescription
                      peer={findById(neighbour.destinationPeerId, peers)}
                      onHover={onPeerHover}
                    />,
                    neighbour.lastUpdateTick,
                  ])}
                />
              </>
            ) : (
              " The node received no new neighbours from the message, so no records were added."
            )}
          </SecondaryDescription>
        </>
      );
    } else {
      const { routes, topologyRecords } = details as OlsrRouteChangeEventDetails;
      return (
        <>
          <TextDescription>
            After detecting a change in the topology (e.g., via <i>HELLO</i> or <i>TC</i> messages),
            the node evaluates the shortest paths to all known destinations based on hop count and
            updates <i>Routing Table</i>.
          </TextDescription>
          <TextDescription>
            Instead of partially updating, it completely rebuilds its routing table with the new
            shortest routes and distance metrics, which will be used for forwarding data packets to
            those destinations.
          </TextDescription>
          <TableDescription
            headers={["Destination", "Next Hop", "Metric", "ANSN", "Last Update"]}
            rows={routes.map((route) => [
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
          {topologyRecords.length > 0 && (
            <>
              <SecondaryDescription title={"How does Topology Set changed?"}>
                <p>
                  The Topology Set is a database within an OLSR node that maintains information
                  about remote network links beyond a two-hop radius. It is dynamically updated
                  whenever the node receives fresh Topology Control (TC) messages or when a topology
                  tuple's expiration timer runs out.
                </p>
                <TableDescription
                  headers={["Destination", "Last Hop", "ANSN", "Last Update"]}
                  rows={topologyRecords.map((route) => [
                    <PeerDescription
                      peer={findById(route.destinationPeerId, peers)}
                      onHover={onPeerHover}
                    />,
                    <PeerDescription
                      peer={findById(route.lastHopPeerId, peers)}
                      onHover={onPeerHover}
                    />,
                    route.sequenceNumber,
                    route.lastUpdateTick,
                  ])}
                />
              </SecondaryDescription>
            </>
          )}
        </>
      );
    }
  }

  if (detailsType === EventDetailsType.OlsrRouteSelected) {
    const routeSelection = details as GetRouteEventDetails;
    const selectedRoute = routeSelection.selectedRoute as OlsrRouteRecord;

    return (
      <>
        <TextDescription>
          Node selected an OLSR next hop for packet forwarding using the currently computed shortest
          route.
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

  if (detailsType === EventDetailsType.OlsrRouteDropped) {
    const { reason } = details as DropEventDetails;

    if (reason === DropReason.Skip) {
      return (
        <TextDescription>
          The node analyzed it's <i>Selector Set</i> and determined that no node selected it as{" "}
          <i>Multipoint Relay (MPR)</i>, so node does not transmit any <i>Transaction Control</i>{" "}
          messages.
        </TextDescription>
      );
    }
  }

  return <></>;
}
