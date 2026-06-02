import {
  type DsrPacket,
  type DsrRouteErrorMessage,
  type NewDsrRouteReplyMessage,
  type NewDsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import MessageField from "@/shared/components/Message/MessageField";
import MessageGroup from "@/shared/components/Message/MessageGroup";
import MessageRow from "@/shared/components/Message/MessageRow";
import {
  getDsrPacketMessageStructure,
  getRouteErrorMessageStructure,
  getRouteReplyMessageStructure,
  getRouteRequestMessageStructure,
} from "@/shared/constants/protocols/dsr";
import type { FieldStructure } from "@/shared/types/common/field";
import { type Message, MessageType } from "@/shared/types/common/messages";
import type { PeerEntity } from "@/shared/types/model/entities";
import type { UUID } from "@/shared/types/common/uuid.ts";

type DsrMessageStructureProps = {
  message: Message;
  peerId: UUID;
  peers: PeerEntity[];
};

export default function DsrMessageStructure({ message, peerId, peers }: DsrMessageStructureProps) {
  const { type: messageType } = message;
  let structure: FieldStructure[][] = [];

  if (messageType === MessageType.DsrPacket) {
    structure = getDsrPacketMessageStructure(message as DsrPacket, peerId, peers);
  }

  // Route Request message
  if (messageType === MessageType.DsrRouteRequestMessage) {
    structure = getRouteRequestMessageStructure(message as NewDsrRouteRequestMessage, peers);
  }

  // Route Reply message
  if (messageType === MessageType.DsrRouteReplyMessage) {
    structure = getRouteReplyMessageStructure(message as NewDsrRouteReplyMessage, peers);
  }

  // Route Error message
  if (messageType === MessageType.DsrRouteErrorMessage) {
    structure = getRouteErrorMessageStructure(message as DsrRouteErrorMessage, peers);
  }

  return (
    <MessageGroup>
      {structure.map((fields, index) => (
        <MessageRow key={index}>
          {fields.map((field, fieldIndex) => (
            <MessageField key={fieldIndex} field={field} />
          ))}
        </MessageRow>
      ))}
    </MessageGroup>
  );
}
