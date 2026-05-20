import SecondaryDescription from "@/shared/components/Description/SecondaryDescription";
import VariableDescription from "@/shared/components/Description/VariableDescription";
import {
  EventType,
  MessageType,
  type BroadcastEventDetails,
  type Event,
} from "@/shared/types/model/simulation";
import TextDescription from "../../../../shared/components/Description/TextDescription";

type BatmanDescriptionProps = {
  event: Event;
};

export default function BatmanDescription({ event }: BatmanDescriptionProps) {
  const { type, details } = event;

  if (type === EventType.SystemMessageBroadcast) {
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

  return (
    <>
      <TextDescription>{"Not my type"}</TextDescription>
    </>
  );
}
