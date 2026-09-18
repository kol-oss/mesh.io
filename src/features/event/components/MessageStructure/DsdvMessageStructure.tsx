import MessageField from "@/shared/components/Message/MessageField";
import MessageGroup from "@/shared/components/Message/MessageGroup";
import MessageRow from "@/shared/components/Message/MessageRow";
import { getDsdvUpdateMessageStructure } from "@/shared/constants/protocols/dsdv";
import type { FieldStructure } from "@/shared/types/common/field";
import { MessageType, type Message } from "@/shared/types/common/messages";
import type { PeerEntity } from "@/shared/types/model/entities";

type MessageStructureProps = {
  message: Message;
  peers: PeerEntity[];
};

export default function DsdvMessageStructure({ message, peers }: MessageStructureProps) {
  let structure: FieldStructure[][] = [];

  if (message.type === MessageType.DsdvRouteUpdateMessage) {
    structure = getDsdvUpdateMessageStructure(message, peers);
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
