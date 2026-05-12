import type { WorkspaceSceneProps } from "../../types/workspace/scene";
import WorkspaceTextEntity from "../WorkspaceTextEntity/WorkspaceTextEntity";

type Props = Pick<
  WorkspaceSceneProps,
  | "texts"
  | "editingTextId"
  | "editingTextDraft"
  | "selectedTextId"
  | "activeDragEntityId"
  | "setEditingTextDraft"
  | "commitTextEdit"
  | "cancelTextEdit"
  | "handleTextPointerDown"
  | "handleEntityPointerMove"
  | "handleEntityPointerEnd"
  | "handleTextDoubleClick"
>;

export default function WorkspaceTexts({
  texts,
  editingTextId,
  editingTextDraft,
  selectedTextId,
  activeDragEntityId,
  setEditingTextDraft,
  commitTextEdit,
  cancelTextEdit,
  handleTextPointerDown,
  handleEntityPointerMove,
  handleEntityPointerEnd,
  handleTextDoubleClick,
}: Props) {
  return (
    <>
      {texts.map((item) => (
        <WorkspaceTextEntity
          key={item.id}
          item={item}
          isEditing={editingTextId === item.id}
          editingTextDraft={editingTextDraft}
          selectedTextId={selectedTextId}
          activeDragEntityId={activeDragEntityId}
          setEditingTextDraft={setEditingTextDraft}
          commitTextEdit={commitTextEdit}
          cancelTextEdit={cancelTextEdit}
          onPointerDown={handleTextPointerDown}
          onPointerMove={handleEntityPointerMove}
          onPointerEnd={handleEntityPointerEnd}
          onDoubleClick={handleTextDoubleClick}
        />
      ))}
    </>
  );
}
