import {
  type BatmanCalculationEventDetails,
  type BatmanRouteRecord,
  type BatmanRouteUpdateEventDetails,
} from "@/features/processor/types/batman";
import PeerDescription from "@/shared/components/Description/PeerDescription";
import SecondaryDescription from "@/shared/components/Description/SecondaryDescription";
import TableDescription from "@/shared/components/Description/TableDescription";
import VariableDescription from "@/shared/components/Description/VariableDescription";
import { BATMAN_EWMA_ALPHA, BATMAN_WIRELESS_BASE_THROUGHPUT } from "@/shared/constants/batman";
import {
  EventType,
  type BroadcastEventDetails,
  type Event,
  type GetRouteEventDetails,
} from "@/shared/types/common/events";
import { MessageType } from "@/shared/types/common/messages";
import type { UUID } from "@/shared/types/common/uuid";
import type { PeerEntity } from "@/shared/types/model/entities";
import { findById } from "@/shared/utils/peers";
import TextDescription from "../../../../shared/components/Description/TextDescription";

type BatmanDescriptionProps = {
  peers: PeerEntity[];
  event: Event;
  onPeerHover: (peerId: UUID) => void;
};

export default function BatmanDescription({ peers, event, onPeerHover }: BatmanDescriptionProps) {
  const { type, details } = event;

  if (type === EventType.Broadcast) {
    const { message, retransmit: isRetransmission } = details as BroadcastEventDetails;
    const { type: messageType } = message;

    // Echo Location Protocol (ELP) broadcast
    if (messageType === MessageType.BatmanEchoLocationMessage) {
      return (
        <>
          <TextDescription>
            Every <VariableDescription value={message.interval}>ELP Interval</VariableDescription>,
            a B.A.T.M.A.N. V node broadcasts an <i>Echo Location Protocol (ELP)</i> message to
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
    if (messageType === MessageType.BatmanOriginatorMessage) {
      return (
        <>
          {!isRetransmission && (
            <TextDescription>
              Every <VariableDescription value={1}>OGM interval</VariableDescription>, an{" "}
              <i>Originator Message version 2 (OGMv2)</i> message is broadcasted to announce the
              node's presence and distribute throughput-related routing metrics called{" "}
              <i>throughput</i> across the mesh network.
            </TextDescription>
          )}
          <TextDescription>
            Neighboring nodes rebroadcast received OGMv2 message if the throughput value is the best
            across all available paths.
          </TextDescription>
          {!isRetransmission && (
            <SecondaryDescription title="Why is the starting throughput value 2^32?">
              Starting OGMv2 message has the maximum possible integer value, so that each hop can
              compare it against the local throughput value. Each subsequent peer combines the
              received value with the one received from ELP using a min() operation, and then
              forwards the resulting value.
            </SecondaryDescription>
          )}
        </>
      );
    }
  }

  if (type === EventType.Calculation) {
    const { breakdown, ogmSelection } = details as BatmanCalculationEventDetails;

    // ELP throughput calculation
    if (breakdown) {
      const {
        baseReferenceThroughput,
        distancePenaltyDistance,
        distancePenaltyPercent,
        baseThroughput,
        distance,
        nextEwma,
        previousEwma,
      } = breakdown;

      const isWireless = breakdown?.baseReferenceThroughput === BATMAN_WIRELESS_BASE_THROUGHPUT;
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
                    value={
                      "Minus " + distancePenaltyPercent + "% per " + distancePenaltyDistance + "m"
                    }
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
                  BATMAN_EWMA_ALPHA +
                  ") * " +
                  (previousEwma || baseThroughput) +
                  " + " +
                  BATMAN_EWMA_ALPHA +
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
              {forwardedThroughput}.
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
  if (type === EventType.AddRoute || type === EventType.UpdateRoute) {
    const { nextRoute } = details as BatmanRouteUpdateEventDetails;

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
                peer={findById(nextRoute?.originatorPeerId as UUID, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(nextRoute?.hopPeerId as UUID, peers)}
                onHover={onPeerHover}
              />,
              nextRoute?.quality,
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
            rows={[(nextRoute?.qualityWindow ?? []).slice(0, 16).map((bit) => (bit ? "1" : "0"))]}
            fontSize={8}
          />
        </SecondaryDescription>
      </>
    );
  }

  // Purge Timeout
  if (type === EventType.DeleteRoute) {
    const { previousRoute } = details as BatmanRouteUpdateEventDetails;
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
                peer={findById(previousRoute?.originatorPeerId as UUID, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(previousRoute?.hopPeerId as UUID, peers)}
                onHover={onPeerHover}
              />,
              previousRoute?.quality,
              previousRoute?.lastTick,
            ],
          ]}
        />
      </>
    );
  }

  // OGMv2 retransmission cancellation
  if (type === EventType.Drop) {
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
  if (type === EventType.GetRoute) {
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
                peer={findById(route?.originatorPeerId as UUID, peers)}
                onHover={onPeerHover}
              />,
              <PeerDescription
                peer={findById(route?.hopPeerId as UUID, peers)}
                onHover={onPeerHover}
              />,
              route?.quality,
              route?.lastTick,
            ],
          ]}
        />
      </>
    );
  }
}
