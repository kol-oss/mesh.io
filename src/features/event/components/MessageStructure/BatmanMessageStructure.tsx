import MessageField from "@/shared/components/Message/MessageField";
import MessageGroup from "@/shared/components/Message/MessageGroup";
import MessageRow from "@/shared/components/Message/MessageRow";
import {
  getEchoLocationMessageStructure,
  getOriginatorMessageStructure,
} from "@/shared/constants/batman";
import type { FieldStructure } from "@/shared/types/common/field";
import { MessageType, type Message } from "@/shared/types/common/messages";
import type { PeerEntity } from "@/shared/types/model/entities";

type MessageStructureProps = {
  message: Message;
  peers: PeerEntity[];
};

export default function BatmanMessageStructure({ message, peers }: MessageStructureProps) {
  const { type: messageType } = message;
  let structure: FieldStructure[][] = [];

  // Echo Location Protocol message
  if (messageType === MessageType.BatmanEchoLocationMessage) {
    structure = getEchoLocationMessageStructure(message, peers);
  }

  // Originator Message version 2 message
  if (messageType === MessageType.BatmanOriginatorMessage) {
    structure = getOriginatorMessageStructure(message, peers);
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
