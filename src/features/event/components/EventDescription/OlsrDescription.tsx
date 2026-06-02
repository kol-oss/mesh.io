import PeerDescription from "@/features/event/components/Description/PeerDescription";
import SecondaryDescription from "@/features/event/components/Description/SecondaryDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import TextDescription from "@/features/event/components/Description/TextDescription";
import VariableDescription from "@/features/event/components/Description/VariableDescription";
import {
  type OlsrBaseChangeEventDetails,
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

type OlsrDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

const getCalculationExplanation = (details: Event["details"]) => {
  const reason = (details as { reason?: string }).reason ?? "";
  const prefix = "Trigger:";
  const stepsPrefix = "Recalculation steps:";

  if (!reason.startsWith(prefix)) {
    return { trigger: null as string | null, steps: [] as string[] };
  }

  const stepsStart = reason.indexOf(stepsPrefix);
  if (stepsStart < 0) {
    return { trigger: reason.replace(prefix, "").trim(), steps: [] as string[] };
  }

  const trigger = reason.slice(prefix.length, stepsStart).trim();
  const steps = reason
    .slice(stepsStart + stepsPrefix.length)
    .trim()
    .split(". ")
    .map((step) => step.trim())
    .filter((step) => step.length > 0)
    .map((step) => (step.endsWith(".") ? step : `${step}.`));

  return { trigger, steps };
};

const getCalculationStep = (steps: string[], prefix: string, fallback: string) => {
  const step = steps.find((entry) => entry.startsWith(prefix));
  if (!step) {
    return fallback;
  }

  return step.endsWith(".") ? step.slice(0, -1) : step;
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

  const { helloInterval } = peer.configuration as OlsrConfiguration;

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

  if (
    detailsType === EventDetailsType.OlsrTcMessageBroadcast ||
    detailsType === EventDetailsType.OlsrTcMessageRetransmission
  ) {
    return (
      <TextDescription>
        The node propagated an OLSR TC message to distribute topology information through the mesh
        for route computation.
      </TextDescription>
    );
  }

  if (detailsType === EventDetailsType.OlsrRouteCalculation) {
    const { trigger, steps } = getCalculationExplanation(details);
    const neighbourSeed = getCalculationStep(
      steps,
      "Neighbor Set",
      "Neighbor Set contributed no symmetric 1-hop neighbours",
    );
    const twoHopSeed = getCalculationStep(
      steps,
      "2-Hop Neighbor Set",
      "2-Hop Neighbor Set contributed no new routes",
    );
    const topologyExpansion = getCalculationStep(
      steps,
      "Topology Table",
      "Topology Table added no routes beyond the 1-hop and 2-hop sets",
    );
    const finalRoutes = getCalculationStep(
      steps,
      "Final OLSR Routing Table",
      "Final OLSR Routing Table is empty",
    );

    return (
      <>
        <TextDescription>
          OLSR route computation rebuilds the forwarding table from the current Neighbor Set, 2-Hop
          Neighbor Set, and Topology Table so packets follow the shortest known next hop.
        </TextDescription>
        <SecondaryDescription title="How are the OLSR routes calculated?">
          <p>
            OLSR calculates routes in layers: it starts with symmetric 1-hop neighbors, extends them
            with the advertised 2-hop neighbors, and then expands farther destinations from TC-based
            topology information.
          </p>
          <br />
          <p>
            This recalculation was triggered by <u>{trigger || "an OLSR control update"}</u>. The{" "}
            <VariableDescription value={neighbourSeed}>Neighbor Set result</VariableDescription> and{" "}
            <VariableDescription value={twoHopSeed}>2-Hop Neighbor Set result</VariableDescription>{" "}
            established the initial candidate routes.
          </p>
          <br />
          <p>
            The{" "}
            <VariableDescription value={topologyExpansion}>
              Topology Table expansion
            </VariableDescription>{" "}
            then refined the path set, producing{" "}
            <VariableDescription value={finalRoutes}>
              the final OLSR Routing Table
            </VariableDescription>
            .
          </p>
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
      const { routes } = details as OlsrRouteChangeEventDetails;
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
    const drop = details as DropEventDetails;

    if (drop.reason === DropReason.NoRoute || drop.reason === DropReason.DestinationUnavailable) {
      return (
        <TextDescription>
          Packet forwarding failed because no valid OLSR next-hop route was available for the
          destination at this tick.
        </TextDescription>
      );
    }

    return (
      <TextDescription>
        Packet forwarding was dropped by OLSR processing due to {drop.reason.toLowerCase()}.
      </TextDescription>
    );
  }

  return <></>;
}
