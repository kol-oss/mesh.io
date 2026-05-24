import PeerDescription from "@/features/event/components/Description/PeerDescription";
import SecondaryDescription from "@/features/event/components/Description/SecondaryDescription";
import TableDescription from "@/features/event/components/Description/TableDescription";
import VariableDescription from "@/features/event/components/Description/VariableDescription";
import { EWMA_ALPHA } from "@/features/processor/constants/ewma";
import {
  type BatmanCalculationEventDetails,
  type BatmanEchoLocationMessage,
  type BatmanRouteChangeEventDetails,
  type BatmanRouteRecord,
} from "@/features/processor/types/protocols/batman";
import { BATMAN_WIRELESS_BASE_THROUGHPUT } from "@/shared/constants/protocols/batman";
import {
  EventDetailsType,
  type BroadcastEventDetails,
  type Event,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import TextDescription from "../Description/TextDescription";

type BatmanDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  detailsType: EventDetailsType;
  onPeerHover: (peerId: UUID) => void;
};

export default function BatmanDescription({
  peers,
  event,
  detailsType,
  onPeerHover,
}: BatmanDescriptionProps) {
  const { details } = event;

  // Echo Location Protocol (ELP) broadcast
  if (detailsType === EventDetailsType.BatmanEchoLocationMessageBroadcast) {
    const { message } = details as BroadcastEventDetails;
    const { interval } = message as BatmanEchoLocationMessage;

    return (
      <>
        <TextDescription>
          Every <VariableDescription value={interval}>ELP Interval</VariableDescription>, a
          B.A.T.M.A.N. V node broadcasts an <i>Echo Location Protocol (ELP)</i> message to
          neighboring nodes to estimate connection quality.
        </TextDescription>
        <TextDescription>
          The node also may append a dedicated neighbor entry for each announced neighbor and
          updates the <i>Number of Neighbors</i> field accordingly to share neighbor topology
          through the network.
        </TextDescription>
      </>
    );
  }

  // Originator Message version 2 (OGMv2) broadcast
  if (detailsType === EventDetailsType.BatmanOriginatorMessageBroadcast) {
    return (
      <>
        <TextDescription>
          Every OGM interval, an <i>Originator Message version 2 (OGMv2)</i> message is broadcasted
          to announce the node's presence and distribute throughput-related routing metrics called{" "}
          <i>throughput</i> across the mesh network.
        </TextDescription>
        <SecondaryDescription title="Why is the starting throughput value 2^32?">
          Starting OGMv2 message has the maximum possible integer value, so that each hop can
          compare it against the local throughput value. Each subsequent peer combines the received
          value with the one received from ELP using a min() operation, and then forwards the
          resulting value.
        </SecondaryDescription>
      </>
    );
  }

  // Originator Message version 2 (OGMv2) broadcast retransmission
  if (detailsType === EventDetailsType.BatmanOriginatorMessageRetransmission) {
    return (
      <>
        <TextDescription>
          Neighboring nodes rebroadcast received OGMv2 message if the throughput value is the best
          across all available paths.
        </TextDescription>
      </>
    );
  }

  if (detailsType === EventDetailsType.BatmanThroughputCalculation) {
    const { elpProcessing: breakdown, ogmProcessing: ogmSelection } =
      details as BatmanCalculationEventDetails;

    // ELP throughput calculation
    if (breakdown) {
      const {
        linkThroughput: baseReferenceThroughput,
        penaltyDistance: penaltyDistance,
        penaltyPercent: penaltyPercent,
        newThroughput: baseThroughput,
        distance,
        smoothedThroughput: nextEwma,
        previousThroughput: previousEwma,
      } = breakdown;

      const isWireless = breakdown?.linkThroughput === BATMAN_WIRELESS_BASE_THROUGHPUT;
      return (
        <>
          <TextDescription>
            Throughput is an <i>Link Layer (OSI-2)</i> estimate of how much useful data can be
            transferred over a link per unit of time. In ELP and B.A.T.M.A.N. V, throughput is used
            as a link-quality metric to help select better routes by favoring links.
          </TextDescription>
          <SecondaryDescription title="How is the throughput value calculated?">
            <p>
              Throughput value is received by OS-level tools and then combined with the measured
              base transmission rate using the <i>Echo Location Protocol (ELP)</i> messages
              reception ratio.
            </p>
            <br />
            <p>
              The base unaffected throughput value for this link is <u>{baseReferenceThroughput}</u>{" "}
              due to the connection type ({isWireless ? "wireless" : "wired"}).
              {isWireless && (
                <>
                  {" "}
                  Since this is a wireless connection, the{" "}
                  <VariableDescription
                    value={"Minus " + penaltyPercent + "% per " + penaltyDistance + "m"}
                  >
                    distance penalty
                  </VariableDescription>{" "}
                  for the <VariableDescription value={distance}>distance</VariableDescription> is
                  applied, which reduces the effective throughput to <u>{baseThroughput}</u>.
                </>
              )}
            </p>
            <br />
            <p>
              The resulting value is then smoothed using an{" "}
              <VariableDescription
                value={
                  "(1 - " +
                  EWMA_ALPHA +
                  ") * " +
                  (previousEwma || baseThroughput) +
                  " + " +
                  EWMA_ALPHA +
                  " * " +
                  baseThroughput +
                  " = " +
                  nextEwma
                }
              >
                Exponentially Weighted Moving Average (EWMA) filter
              </VariableDescription>{" "}
              to prevent rapid fluctuations, giving the result of {nextEwma}.
            </p>
          </SecondaryDescription>
        </>
      );
    }

    // OGMv2 throughput calculation
    if (ogmSelection) {
      const {
        receivedThroughput,
        neighbourThroughput,
        hopPenaltyPercent,
        forwardedThroughput,
        isWirelessHop: isWireless,
      } = ogmSelection;

      return (
        <>
          <TextDescription>
            Throughput is an <i>Link Layer (OSI-2)</i> estimate of how much useful data can be
            transferred over a link per unit of time. In ELP and B.A.T.M.A.N. V, throughput is used
            as a link-quality metric to help select better routes by favoring links.
          </TextDescription>
          <SecondaryDescription title="What throughput value was selected?">
            <p>
              The received value of throughput from OGMv2 message was {receivedThroughput}, and
              value from Neighbours Table was {neighbourThroughput}, so minimum selected value was{" "}
              {Math.min(receivedThroughput, neighbourThroughput)}.
            </p>
            <br />
            <p>
              {isWireless
                ? `Because this is a wireless hop, peer penalty of ${hopPenaltyPercent}% was applied. `
                : ""}
              Final value is <u>{forwardedThroughput}</u>, and this value will be used as route
              throughput in retransmissions.
            </p>
          </SecondaryDescription>
        </>
      );
    }
  }

  // Originator addition or update
  if (
    detailsType === EventDetailsType.BatmanOriginatorAdded ||
    detailsType === EventDetailsType.BatmanOriginatorUpdated
  ) {
    const { nextRoute } = details as BatmanRouteChangeEventDetails;

    return (
      <>
        <TextDescription>
          After receiving OGMv2 message, the node evaluates if the new path offers better throughput
          than the existing one. If so, it updates its routing table with the new route and
          throughput value, which will be used for forwarding packets to that destination.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Throughput", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(nextRoute?.originatorId as UUID, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(nextRoute?.hopId as UUID, peers)}
                onHover={onPeerHover}
              />,
              nextRoute?.throughput,
              nextRoute?.lastTick,
            ],
          ]}
        />
        <SecondaryDescription title="How the duplicates are handled?">
          <p>
            The duplicate suppression mechanism is designed to prevent the processing of duplicate
            or out-of-range messages by maintaining a Sequence Protection Window. This window tracks
            the accepted sequence numbers for each originator peer, and when a new OGM is received,
            its sequence number is compared against the other entries.
          </p>
          <br />
          <TableDescription
            rows={[(nextRoute?.sequenceWindow ?? []).slice(0, 16).map((bit) => (bit ? "1" : "0"))]}
            fontSize={8}
          />
        </SecondaryDescription>
      </>
    );
  }

  // Purge Timeout
  if (detailsType === EventDetailsType.BatmanOriginatorRemoved) {
    const { previousRoute } = details as BatmanRouteChangeEventDetails;
    return (
      <>
        <TextDescription>
          If the node detects that a route is no longer accessible during Purge Timeout, it removes
          the corresponding entries from the <i>Neighbours List</i> and <i>Originators Table</i>.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Throughput", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(previousRoute?.originatorId as UUID, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(previousRoute?.hopId as UUID, peers)}
                onHover={onPeerHover}
              />,
              previousRoute?.throughput,
              previousRoute?.lastTick,
            ],
          ]}
        />
      </>
    );
  }

  // OGMv2 retransmission cancellation
  if (detailsType === EventDetailsType.BatmanOriginatorMessageDropped) {
    return (
      <>
        <TextDescription>
          There are already record in the <i>Originators Table</i> to the specified destination with
          better throughput, so the OGMv2 message will not be retransmitted.
        </TextDescription>
      </>
    );
  }

  // Get originator route
  if (detailsType === EventDetailsType.BatmanOriginatorSelected) {
    const { selectedRoute } = details as GetRouteEventDetails;
    const route = selectedRoute as BatmanRouteRecord;

    return (
      <>
        <TextDescription>
          The node selected the route to the destination peer based on the best throughput value in
          the <i>Originators Table</i>.
        </TextDescription>
        <TableDescription
          headers={["Destination", "Next Hop", "Throughput", "Last Seen"]}
          rows={[
            [
              <PeerDescription
                peer={findById(route?.originatorId as UUID, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(route?.hopId as UUID, peers)}
                onHover={onPeerHover}
              />,
              route?.throughput,
              route?.lastTick,
            ],
          ]}
        />
      </>
    );
  }
}
