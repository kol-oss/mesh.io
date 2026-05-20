import SecondaryDescription from "@/shared/components/Description/SecondaryDescription";
import VariableDescription from "@/shared/components/Description/VariableDescription";
import { BATMAN_EWMA_ALPHA, BATMAN_WIRELESS_BASE_THROUGHPUT } from "@/shared/constants/batman";
import {
  EventType,
  MessageType,
  type BroadcastEventDetails,
  type Event,
  type ThroughputCalculationEventDetails,
} from "@/shared/types/model/simulation";
import TextDescription from "../../../../shared/components/Description/TextDescription";

type BatmanDescriptionProps = {
  event: Event;
};

export default function BatmanDescription({ event }: BatmanDescriptionProps) {
  const { type, details } = event;

  if (type === EventType.Broadcast) {
    const { message } = details as BroadcastEventDetails;
    const { kind: messageType } = message;

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
          <TextDescription>
            Every <VariableDescription value={1}>OGM interval</VariableDescription>, an{" "}
            <i>Originator Message version 2 (OGMv2)</i> message is broadcasted to announce the
            node's presence and distribute throughput-related routing metrics called{" "}
            <i>throughput</i> across the mesh network.
          </TextDescription>
          <TextDescription>
            Neighboring nodes rebroadcast received OGMv2 messages if the throughput value is the
            best across all available paths.
          </TextDescription>
          <SecondaryDescription title="Why is the starting throughput value 2^32?">
            Starting OGMv2 message has the maximum possible integer value, so that each hop can
            compare it against the local throughput value. Each subsequent peer combines the
            received value with the one received from ELP using a min() operation, and then forwards
            the resulting value.
          </SecondaryDescription>
        </>
      );
    }
  }

  if (type === EventType.Calculation) {
    const { breakdown, ogmSelection } = details as ThroughputCalculationEventDetails;

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
    } else if (ogmSelection) {
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

  return (
    <>
      <TextDescription>{"Not my type"}</TextDescription>
    </>
  );
}
