import {
  type DsrRouteErrorMessage,
  type DsrRouteReplyMessage,
  type DsrRouteRequestMessage,
} from "@/features/processor/types/protocols/dsr";
import MessageField from "@/shared/components/Message/MessageField";
import MessageGroup from "@/shared/components/Message/MessageGroup";
import MessageRow from "@/shared/components/Message/MessageRow";
import {
  getRouteErrorMessageStructure,
  getRouteReplyMessageStructure,
  getRouteRequestMessageStructure,
} from "@/shared/constants/protocols/dsr";
import type { FieldStructure } from "@/shared/types/common/field";
import { MessageType, type Message } from "@/shared/types/common/messages";
import type { PeerEntity } from "@/shared/types/model/entities";

type DsrMessageStructureProps = {
  message: Message;
  peers: PeerEntity[];
};

export default function DsrMessageStructure({ message, peers }: DsrMessageStructureProps) {
  const { type: messageType } = message;
  let structure: FieldStructure[][] = [];

  // Route Request message
  if (messageType === MessageType.DsrRouteRequestMessage) {
    structure = getRouteRequestMessageStructure(message as DsrRouteRequestMessage, peers);
  }

  // Route Reply message
  if (messageType === MessageType.DsrRouteReplyMessage) {
    structure = getRouteReplyMessageStructure(message as DsrRouteReplyMessage, peers);
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
